"""Contratos ejecutables de Fase 4; no proporciona autenticación ni persistencia."""
from dataclasses import dataclass, replace
from datetime import datetime, timezone


class BusinessError(ValueError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def identity(value):
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        raise BusinessError('INVALID_IDENTIFIER')
    return value


def version(value):
    if type(value) is not int or value < 1:
        raise BusinessError('INVALID_VERSION')
    return value


def instant(value):
    if not isinstance(value, str):
        raise BusinessError('INVALID_TIMESTAMP')
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise BusinessError('INVALID_TIMESTAMP') from None
    if result.tzinfo is None or result.utcoffset() is None:
        raise BusinessError('INVALID_TIMESTAMP')
    return result.astimezone(timezone.utc)


@dataclass(frozen=True)
class Actor:
    id: str
    role: str
    organization_id: str
    active: bool = True


@dataclass(frozen=True)
class Resource:
    id: str
    kind: str
    owner_id: str
    organization_id: str


READ_ACTIONS = {'analysis.read': 'analysis', 'dashboard.read': 'dashboard',
                'alert.read': 'alert', 'export.create': 'analysis'}
ADMIN_ACTIONS = {'configuration.write': 'configuration', 'users.write': 'user',
                 'retention.delete': 'analysis'}
ROLES = {'operator', 'supervisor', 'administrator', 'auditor'}


def allowed(actor, action, resource=None, mode='demo'):
    """Decisión de referencia; actor y recurso deben venir de datos fiables en API."""
    if (not isinstance(actor, Actor) or actor.active is not True
            or not isinstance(actor.role, str) or actor.role not in ROLES
            or not isinstance(action, str) or not isinstance(mode, str) or mode not in {'demo', 'real'}):
        return False
    try:
        identity(actor.id); identity(actor.organization_id)
    except BusinessError:
        return False
    if action == 'analysis.create':
        return resource is None and actor.role != 'auditor'
    if not isinstance(resource, Resource):
        return False
    try:
        identity(resource.id); identity(resource.owner_id); identity(resource.organization_id)
    except BusinessError:
        return False
    if actor.organization_id != resource.organization_id:
        return False
    if action in READ_ACTIONS:
        return resource.kind == READ_ACTIONS[action] and (actor.role != 'operator' or actor.id == resource.owner_id)
    if action == 'alert.review':
        return resource.kind == 'alert' and actor.role in {'supervisor', 'administrator'}
    if action == 'audit.read':
        return resource.kind == 'audit' and actor.role in {'administrator', 'auditor'}
    if action in ADMIN_ACTIONS:
        return (resource.kind == ADMIN_ACTIONS[action] and actor.role == 'administrator'
                and (action != 'users.write' or mode == 'real'))
    return False


@dataclass(frozen=True)
class AnalysisState:
    id: str
    correlation_id: str
    owner_id: str
    organization_id: str
    origin: str
    updated_at: str
    state: str = 'queued'
    version: int = 1
    error_code: str | None = None

    def __post_init__(self):
        for value in (self.id, self.correlation_id, self.owner_id, self.organization_id):identity(value)
        version(self.version); instant(self.updated_at)
        if (not isinstance(self.origin, str) or self.origin not in {'demo', 'real'}
                or not isinstance(self.state, str) or self.state not in {'queued', 'processing', 'completed', 'failed'}):
            raise BusinessError('INVALID_STATE')
        if self.state == 'failed':identity(self.error_code)
        elif self.error_code is not None:raise BusinessError('INVALID_STATE')


def transition_analysis(record, *, target, analysis_id, correlation_id, expected_version,
                        occurred_at, result_validated=False, result_persisted=False, error_code=None):
    if record.id != analysis_id or record.correlation_id != correlation_id:
        raise BusinessError('STALE_EXECUTION')
    version(expected_version)
    if record.version != expected_version:
        raise BusinessError('VERSION_CONFLICT')
    if instant(occurred_at) < instant(record.updated_at):
        raise BusinessError('STALE_EXECUTION')
    if not isinstance(target, str) or target not in {'queued', 'processing', 'completed', 'failed'}:
        raise BusinessError('INVALID_STATE')
    graph = {'queued': {'processing', 'failed'}, 'processing': {'completed', 'failed'},
             'completed': set(), 'failed': set()}
    if target not in graph[record.state]:
        raise BusinessError('INVALID_TRANSITION')
    if target == 'completed' and (result_validated is not True or result_persisted is not True):
        raise BusinessError('RESULT_NOT_COMMITTED')
    if target == 'failed':identity(error_code)
    elif error_code is not None:raise BusinessError('INVALID_STATE')
    return replace(record, state=target, version=record.version + 1,
                   updated_at=occurred_at, error_code=error_code)


@dataclass(frozen=True)
class Review:
    actor_id: str
    before: str
    after: str
    note: str
    occurred_at: str
    resulting_version: int


@dataclass(frozen=True)
class AlertState:
    id: str
    analysis_id: str
    owner_id: str
    organization_id: str
    updated_at: str
    state: str = 'new'
    version: int = 1
    reviews: tuple[Review, ...] = ()

    def __post_init__(self):
        for value in (self.id, self.analysis_id, self.owner_id, self.organization_id):identity(value)
        version(self.version); instant(self.updated_at)
        if not isinstance(self.state, str) or self.state not in {'new', 'reviewed', 'closed'}:
            raise BusinessError('INVALID_STATE')
        if not isinstance(self.reviews, tuple) or any(not isinstance(item, Review) for item in self.reviews):
            raise BusinessError('INVALID_STATE')


def review_alert(record, actor, *, target, expected_version, note, occurred_at, mode='demo'):
    resource = Resource(record.id, 'alert', record.owner_id, record.organization_id)
    if not allowed(actor, 'alert.review', resource, mode):
        raise BusinessError('ACCESS_DENIED')
    version(expected_version)
    if record.version != expected_version:
        raise BusinessError('VERSION_CONFLICT')
    if instant(occurred_at) < instant(record.updated_at):
        raise BusinessError('STALE_EXECUTION')
    if not isinstance(target, str) or target not in {'new', 'reviewed', 'closed'}:
        raise BusinessError('INVALID_STATE')
    graph = {'new': {'reviewed'}, 'reviewed': {'closed'}, 'closed': set()}
    if target not in graph[record.state]:
        raise BusinessError('INVALID_TRANSITION')
    if not isinstance(note, str) or not note.strip() or len(note) > 2000:
        raise BusinessError('INVALID_REVIEW_NOTE')
    event = Review(actor.id, record.state, target, note.strip(), occurred_at, record.version + 1)
    return replace(record, state=target, version=record.version + 1, updated_at=occurred_at,
                   reviews=record.reviews + (event,))
