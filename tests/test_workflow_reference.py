import unittest
from tools.workflow_reference import (Actor, Resource, AnalysisState, AlertState,
    BusinessError, allowed, transition_analysis, review_alert)

T0='2026-11-03T00:00:00Z';T1='2026-11-03T00:00:01Z';T2='2026-11-03T00:00:02Z'


class WorkflowReferenceTests(unittest.TestCase):
    def setUp(self):
        self.analysis=AnalysisState('a1','c1','u1','org1','demo',updated_at=T0)
        self.alert=AlertState('alert1','a1','u1','org1',updated_at=T0)
        self.actors={role:Actor('u1' if role=='operator' else role,role,'org1')
                     for role in ('operator','supervisor','administrator','auditor')}

    def transition(self,record=None,**kw):
        record=record or self.analysis
        values=dict(target='processing',analysis_id='a1',correlation_id='c1',
                    expected_version=record.version,occurred_at=T1)
        values.update(kw);return transition_analysis(record,**values)

    def review(self,record=None,actor=None,**kw):
        record=record or self.alert;actor=actor or self.actors['supervisor']
        values=dict(target='reviewed',expected_version=record.version,note='Evidencia revisada.',occurred_at=T1)
        values.update(kw);return review_alert(record,actor,**values)

    def assertCode(self,code,operation):
        with self.assertRaises(BusinessError) as error:operation()
        self.assertEqual(error.exception.code,code)

    def test_analysis_happy_path_and_immutable_original(self):
        started=self.transition()
        completed=self.transition(started,target='completed',occurred_at=T2,result_validated=True,result_persisted=True)
        self.assertEqual((completed.state,completed.version,completed.origin),('completed',3,'demo'))
        self.assertEqual((self.analysis.state,self.analysis.version),('queued',1))

    def test_cannot_skip_processing(self):
        self.assertCode('INVALID_TRANSITION',lambda:self.transition(target='completed',result_validated=True,result_persisted=True))

    def test_completed_needs_validated_and_persisted_results(self):
        started=self.transition()
        for validated,persisted in [(False,True),(True,False),(False,False),(1,True)]:
            self.assertCode('RESULT_NOT_COMMITTED',lambda:self.transition(started,target='completed',result_validated=validated,result_persisted=persisted))
        self.assertEqual(started.state,'processing')

    def test_terminal_analysis_cannot_be_retried_in_place(self):
        failed=self.transition(target='failed',error_code='ENGINE_FAILED')
        self.assertCode('INVALID_TRANSITION',lambda:self.transition(failed))
        started=self.transition();done=self.transition(started,target='completed',result_validated=True,result_persisted=True)
        self.assertCode('INVALID_TRANSITION',lambda:self.transition(done,target='failed',error_code='ENGINE_FAILED'))

    def test_failure_preserves_explicit_reason(self):
        for record in (self.analysis,self.transition()):
            failed=self.transition(record,target='failed',error_code='STORAGE_WRITE_FAILED')
            self.assertEqual(failed.error_code,'STORAGE_WRITE_FAILED')
        self.assertCode('INVALID_IDENTIFIER',lambda:self.transition(target='failed'))

    def test_version_conflict_blocks_duplicate_event(self):
        started=self.transition()
        self.assertCode('VERSION_CONFLICT',lambda:self.transition(started,expected_version=1))

    def test_execution_and_correlation_are_both_required(self):
        self.assertCode('STALE_EXECUTION',lambda:self.transition(analysis_id='other'))
        self.assertCode('STALE_EXECUTION',lambda:self.transition(correlation_id='other'))

    def test_timestamp_requires_timezone_and_monotonic_order(self):
        self.assertCode('INVALID_TIMESTAMP',lambda:self.transition(occurred_at='2026-11-03T00:00:01'))
        self.assertCode('STALE_EXECUTION',lambda:self.transition(occurred_at='2026-11-02T23:59:59Z'))
        self.assertEqual(self.transition(occurred_at='2026-11-02T19:00:01-05:00').state,'processing')

    def test_invalid_identity_version_and_state(self):
        for change,expected in [({'id':''},'INVALID_IDENTIFIER'),({'version':True},'INVALID_VERSION'),
                                ({'origin':'unknown'},'INVALID_STATE'),({'state':'invented'},'INVALID_STATE')]:
            args=dict(id='a1',correlation_id='c1',owner_id='u1',organization_id='org1',origin='demo',updated_at=T0);args.update(change)
            self.assertCode(expected,lambda:AnalysisState(**args))
        self.assertCode('INVALID_STATE',lambda:self.transition(target='invented'))

    def test_operator_reads_own_not_other_resources(self):
        actor=self.actors['operator']
        for action,kind in [('analysis.read','analysis'),('dashboard.read','dashboard'),('alert.read','alert'),('export.create','analysis')]:
            self.assertTrue(allowed(actor,action,Resource('r',kind,'u1','org1')))
            self.assertFalse(allowed(actor,action,Resource('r',kind,'u2','org1')))

    def test_supervisor_admin_auditor_read_organization(self):
        for role in ('supervisor','administrator','auditor'):
            actor=self.actors[role]
            self.assertTrue(allowed(actor,'analysis.read',Resource('r','analysis','u2','org1')))
            self.assertTrue(allowed(actor,'export.create',Resource('r','analysis','u2','org1')))

    def test_no_role_crosses_organization_boundary(self):
        for actor in self.actors.values():
            for action,kind in [('analysis.read','analysis'),('alert.review','alert'),('configuration.write','configuration'),('retention.delete','analysis')]:
                self.assertFalse(allowed(actor,action,Resource('r',kind,'u1','other')))

    def test_auditor_cannot_execute_or_modify(self):
        actor=self.actors['auditor']
        self.assertFalse(allowed(actor,'analysis.create'))
        for action,kind in [('alert.review','alert'),('configuration.write','configuration'),('users.write','user'),('retention.delete','analysis')]:
            self.assertFalse(allowed(actor,action,Resource('r',kind,'u1','org1'),mode='real'))

    def test_creation_and_administration_matrix(self):
        for role in ('operator','supervisor','administrator'):
            self.assertTrue(allowed(self.actors[role],'analysis.create'))
        for role,actor in self.actors.items():
            for action,kind in [('configuration.write','configuration'),('retention.delete','analysis')]:
                self.assertEqual(allowed(actor,action,Resource('r',kind,'u1','org1')),role=='administrator')

    def test_users_are_only_administrable_in_real_mode(self):
        resource=Resource('r','user','u1','org1');actor=self.actors['administrator']
        self.assertFalse(allowed(actor,'users.write',resource,mode='demo'))
        self.assertTrue(allowed(actor,'users.write',resource,mode='real'))

    def test_audit_read_restricted_to_admin_and_auditor(self):
        for role,actor in self.actors.items():
            self.assertEqual(allowed(actor,'audit.read',Resource('r','audit','u1','org1')),role in ('administrator','auditor'))

    def test_unknown_action_role_inactive_invalid_mode_fail_closed(self):
        resource=Resource('r','analysis','u1','org1')
        self.assertFalse(allowed(self.actors['administrator'],'unknown',resource))
        for actor in (Actor('u1','invented','org1'),Actor('u1','administrator','org1',False),Actor('','operator','org1'),None):
            self.assertFalse(allowed(actor,'analysis.read',resource))
        self.assertFalse(allowed(self.actors['administrator'],'analysis.read',resource,mode='unknown'))

    def test_unstructured_policy_inputs_fail_closed(self):
        actor=self.actors['administrator'];resource=Resource('r','analysis','u1','org1')
        self.assertFalse(allowed(actor,[],resource))
        self.assertFalse(allowed(actor,'analysis.read',resource,mode=[]))
        self.assertFalse(allowed(Actor('u1',[],'org1'),'analysis.read',resource))

    def test_unstructured_transition_target_is_explicit_error(self):
        self.assertCode('INVALID_STATE',lambda:self.transition(target=[]))
        self.assertCode('INVALID_STATE',lambda:self.review(target=[]))

    def test_resource_kind_and_presence_checked(self):
        actor=self.actors['administrator']
        self.assertFalse(allowed(actor,'analysis.read',Resource('r','configuration','u1','org1')))
        self.assertFalse(allowed(actor,'analysis.read'))
        self.assertFalse(allowed(actor,'analysis.create',Resource('r','analysis','u1','org1')))

    def test_alert_review_close_creates_immutable_audit_chain(self):
        reviewed=self.review();closed=self.review(reviewed,target='closed',occurred_at=T2,note='Cierre confirmado.')
        self.assertEqual((closed.state,closed.version),('closed',3))
        self.assertEqual(len(closed.reviews),2);self.assertEqual(len(self.alert.reviews),0)
        self.assertEqual(closed.reviews[0].actor_id,'supervisor')
        self.assertEqual((closed.reviews[1].before,closed.reviews[1].after),('reviewed','closed'))
        self.assertEqual(closed.analysis_id,'a1')

    def test_alert_does_not_close_without_review_or_reopen(self):
        self.assertCode('INVALID_TRANSITION',lambda:self.review(target='closed'))
        closed=self.review(self.review(),target='closed',occurred_at=T2)
        self.assertCode('INVALID_TRANSITION',lambda:self.review(closed,occurred_at=T2))

    def test_operator_auditor_other_org_cannot_review(self):
        for actor in (self.actors['operator'],self.actors['auditor'],Actor('s','supervisor','other')):
            self.assertCode('ACCESS_DENIED',lambda:self.review(actor=actor))
        self.assertEqual(self.review(actor=self.actors['administrator']).state,'reviewed')

    def test_empty_or_excessive_review_note_rejected(self):
        for note in ('','  ','x'*2001,None):
            self.assertCode('INVALID_REVIEW_NOTE',lambda:self.review(note=note))

    def test_stale_review_has_no_side_effects(self):
        reviewed=self.review()
        self.assertCode('VERSION_CONFLICT',lambda:self.review(reviewed,target='closed',expected_version=1))
        self.assertEqual(len(reviewed.reviews),1);self.assertEqual(reviewed.state,'reviewed')

    def test_alert_review_timestamp_must_not_go_backwards(self):
        self.assertCode('STALE_EXECUTION',lambda:self.review(occurred_at='2026-11-02T23:59:59Z'))
        self.assertCode('INVALID_TIMESTAMP',lambda:self.review(occurred_at='invalid'))


if __name__=='__main__':unittest.main()
