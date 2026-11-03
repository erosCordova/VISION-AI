"""Valida coherencia de recursos y referencias; no evalúa un detector real."""
import hashlib
import json
from pathlib import Path
import struct
import unittest
from tools.vision_reference import Box

ROOT=Path(__file__).resolve().parents[1]
CATALOG=ROOT/'docs/fixtures/scenarios/catalog.json'


def center(box):return box['x']+box['width']/2,box['y']+box['height']/2

def inside(point,bounds):
    x,y=point
    return (bounds['x']-1e-9<=x<=bounds['x']+bounds['width']+1e-9 and
            bounds['y']-1e-9<=y<=bounds['y']+bounds['height']+1e-9)

def polygon_area(points):
    return abs(sum(x1*y2-x2*y1 for (x1,y1),(x2,y2) in zip(points,points[1:]+points[:1])))/2


class ScenarioCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads(CATALOG.read_text());cls.scenarios=cls.data['scenarios']
        cls.by_id={s['id']:s for s in cls.scenarios}

    def test_four_versioned_scenarios_and_one_pilot(self):
        self.assertEqual(set(self.by_id),{'industrial-safety','smart-warehouse','quality-control','retail'})
        self.assertEqual(sum(s['pilot'] for s in self.scenarios),1)
        self.assertTrue(self.by_id['industrial-safety']['pilot'])
        for s in self.scenarios:
            self.assertEqual(s['origin'],'demo');self.assertEqual(s['version'],'1.0.0')
            self.assertTrue(s['evidencePolicy']);self.assertEqual(s['reviewRole'],'supervisor')

    def test_positive_negative_ambiguous_for_each(self):
        ids=[]
        for s in self.scenarios:
            self.assertEqual({c['kind'] for c in s['cases']},{'positive','negative','ambiguous'})
            for c in s['cases']:
                ids.append(c['id'])
                self.assertEqual(c['expected']['status'],{'positive':'triggered','negative':'not-triggered','ambiguous':'indeterminate'}[c['kind']])
        self.assertEqual(len(ids),len(set(ids)));self.assertEqual(len(ids),12)

    def test_assets_exist_match_hash_and_dimensions(self):
        paths=[]
        for s in self.scenarios:
            for c in s['cases']:
                asset=c['asset'];path=(ROOT/asset['path']).resolve()
                self.assertTrue(path.is_relative_to((ROOT/'assets/scenarios').resolve()))
                b=path.read_bytes();self.assertEqual(hashlib.sha256(b).hexdigest(),asset['sha256'])
                self.assertEqual(b[:8],b'\x89PNG\r\n\x1a\n')
                self.assertEqual(b[12:16],b'IHDR')
                self.assertEqual(struct.unpack('>II',b[16:24]),(asset['width'],asset['height']))
                self.assertEqual((asset['width'],asset['height']),(800,600))
                self.assertLess(len(b),10*1024*1024)
                self.assertIn('schematic',asset['provenance']);self.assertIn('not inferred',asset['usage'])
                paths.append(path)
        self.assertEqual(len(paths),len(set(paths)))

    def test_every_object_has_valid_box_and_class(self):
        for s in self.scenarios:
            for c in s['cases']:
                for obj in c['objects']:
                    self.assertIn(obj['classId'],s['classes']);Box(**obj['box'])
                if 'occludedRegion' in c['observations']:Box(**c['observations']['occludedRegion'])

    def test_evidence_and_associations_reference_same_case(self):
        for s in self.scenarios:
            for c in s['cases']:
                ids=[o['id'] for o in c['objects']];self.assertEqual(len(ids),len(set(ids)))
                self.assertTrue(set(c['expected']['evidenceRefs']).issubset(ids))
                for obj in c['objects']:
                    for key in ('associatedPersonId','associatedProductId'):
                        if key in obj:self.assertIn(obj[key],ids)

    def test_ppe_visibility_and_instance_association(self):
        s=self.by_id['industrial-safety']
        for c in s['cases']:
            obs=c['observations'];person_id=obs['personId']
            for obj in c['objects']:
                if obj['classId'] in ('helmet','vest'):self.assertEqual(obj['associatedPersonId'],person_id)
            if c['kind']=='positive':
                self.assertTrue(obs['headVisible']);self.assertFalse(obs['helmetPresent'])
                self.assertTrue(obs['assessmentComplete'])
            if c['kind']=='negative':self.assertTrue(obs['helmetPresent'] and obs['vestPresent'])
            if c['kind']=='ambiguous':
                self.assertFalse(obs['headVisible']);self.assertIsNone(obs['helmetPresent'])

    def test_warehouse_center_matches_reference(self):
        s=self.by_id['smart-warehouse'];bounds=s['zone']['bounds']
        for c in s['cases']:
            subject=next(o for o in c['objects'] if o['id']==c['observations']['subjectId'])
            if c['kind']=='positive':self.assertTrue(inside(center(subject['box']),bounds))
            if c['kind']=='negative':self.assertFalse(inside(center(subject['box']),bounds))
            if c['kind']=='ambiguous':self.assertFalse(c['observations']['centerReliable'])

    def test_zone_boundary_includes_four_edges(self):
        b=self.by_id['smart-warehouse']['zone']['bounds'];x,y,w,h=b['x'],b['y'],b['width'],b['height']
        for point in [(x,y),(x+w,y),(x,y+h),(x+w,y+h),(x,y+h/2)]:self.assertTrue(inside(point,b))
        self.assertFalse(inside((x-1e-5,y+h/2),b))

    def test_warehouse_geometric_border_still_needs_reliability(self):
        s=self.by_id['smart-warehouse'];c=next(c for c in s['cases'] if c['kind']=='ambiguous')
        self.assertTrue(inside(center(c['objects'][0]['box']),s['zone']['bounds']))
        self.assertFalse(c['observations']['centerReliable'])
        self.assertEqual(c['expected']['status'],'indeterminate')

    def test_quality_defect_ratio_uses_product_area(self):
        s=self.by_id['quality-control']
        for c in s['cases']:
            product=next(o for o in c['objects'] if o['classId']=='product')
            defects=[o for o in c['objects'] if o['classId']=='surface-defect']
            ratio=sum(polygon_area(o['polygon']) for o in defects)/Box(**product['box']).area
            if c['kind']!='ambiguous':self.assertAlmostEqual(ratio,c['expected']['defectProductRatio'])
            if c['kind']=='positive':self.assertGreater(ratio,s['rule']['threshold'])
            if c['kind']=='negative':self.assertEqual(ratio,0)
            if c['kind']=='ambiguous':self.assertFalse(c['observations']['inspectionComplete'])

    def test_defect_polygon_is_inside_product_and_its_box(self):
        s=self.by_id['quality-control']
        for c in s['cases']:
            by_id={o['id']:o for o in c['objects']}
            for obj in c['objects']:
                if obj['classId']=='surface-defect':
                    for point in obj['polygon']:
                        self.assertTrue(inside(point,obj['box']))
                        self.assertTrue(inside(point,by_id[obj['associatedProductId']]['box']))

    def test_retail_annotated_count_interval(self):
        s=self.by_id['retail']
        for c in s['cases']:
            uncertain=set(c['observations']['uncertainPersonIds'])
            people=[o for o in c['objects'] if o['classId']=='person' and inside(center(o['box']),s['zone']['bounds'])]
            known=sum(o['id'] not in uncertain for o in people)
            self.assertEqual(c['expected']['countRange'],[known,len(people)])
            if c['kind']=='positive':self.assertGreater(known,s['rule']['threshold'])
            if c['kind']=='negative':self.assertLessEqual(len(people),s['rule']['threshold'])
            if c['kind']=='ambiguous':self.assertLessEqual(known,s['rule']['threshold']);self.assertGreater(len(people),s['rule']['threshold'])

    def test_retail_threshold_is_strict(self):
        s=self.by_id['retail'];c=next(c for c in s['cases'] if c['kind']=='negative')
        self.assertEqual(c['expected']['countRange'],[2,2])
        self.assertEqual(s['rule']['operator'],'>');self.assertEqual(c['expected']['status'],'not-triggered')

    def test_asset_directory_has_no_untracked_reference(self):
        expected={c['asset']['path'] for s in self.scenarios for c in s['cases']}
        actual={str(p.relative_to(ROOT)) for p in (ROOT/'assets/scenarios').glob('*.png')}
        self.assertEqual(expected,actual)


if __name__=='__main__':unittest.main()
