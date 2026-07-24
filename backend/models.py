from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ContentContributor(BaseModel):
    id: int
    username: str
    display_name: str
    profile_url: Optional[str] = None
    role: str
    role_keys: List[str] = Field(default_factory=list)
    is_active: bool


# 题目模型


class Question(BaseModel):
    id: str
    question: str
    answer: str
    resources: List[str] = []
    tag: str = Field(min_length=1, max_length=50)
    author: List[str] = []  # 改为多选
    contributors: List[ContentContributor] = Field(default_factory=list)
    random_clicks: int = 0
    hide_clicks: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# 创建题目请求


class QuestionCreate(BaseModel):
    question: str
    answer: str
    resources: List[str] = []
    tag: str = Field(default="common", min_length=1, max_length=50)
    author: List[str] = []
    contributor_ids: List[int] = Field(default_factory=list)

# 更新题目请求


class QuestionUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    resources: Optional[List[str]] = None
    tag: Optional[str] = Field(default=None, min_length=1, max_length=50)
    author: Optional[List[str]] = None
    contributor_ids: Optional[List[int]] = None

# 批量导入题目项


class QuestionImportItem(BaseModel):
    id: Optional[str] = None  # 如果有ID则更新，否则创建
    question: str
    answer: str
    resources: List[str] = []
    tag: str = Field(default="common", min_length=1, max_length=50)
    author: List[str] = []


# 批量导入请求


class QuestionBatchImport(BaseModel):
    questions: List[QuestionImportItem]


# 批量导入响应


class QuestionBatchImportResult(BaseModel):
    success_count: int
    fail_count: int
    errors: List[dict] = []  # {"index": int, "id": str, "error": str}

# 用户答题请求


class AnswerSubmit(BaseModel):
    question_id: str
    answer: str

# 用户答题响应


class AnswerResponse(BaseModel):
    correct: bool
    correct_answer: str

# 管理员登录请求


class AdminLogin(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=4096)


# Token 响应


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_token_expires_in: int
    refresh_token_expires_in: int


# 管理员账号管理


class AdminAssignedRole(BaseModel):
    key: str
    name: str


class AdminUser(BaseModel):
    id: int
    username: str
    role: str
    role_name: str
    roles: List[AdminAssignedRole] = Field(default_factory=list)
    role_keys: List[str] = Field(default_factory=list)
    role_names: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)
    is_active: bool
    display_name: str
    profile_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    roles: Optional[List[str]] = None
    role: Optional[str] = Field(default=None, min_length=1, max_length=50)
    display_name: Optional[str] = Field(default=None, max_length=100)
    profile_url: Optional[str] = Field(default=None, max_length=500)


class AdminUserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    roles: Optional[List[str]] = None
    role: Optional[str] = Field(default=None, min_length=1, max_length=50)
    is_active: Optional[bool] = None
    display_name: Optional[str] = Field(default=None, max_length=100)
    profile_url: Optional[str] = Field(default=None, max_length=500)


class AdminProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    profile_url: Optional[str] = Field(default=None, max_length=500)


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class AccessPermission(BaseModel):
    key: str
    name: str
    description: str = ""
    category: str = ""
    position: int = 0


class AccessRole(BaseModel):
    key: str
    name: str
    description: str = ""
    is_system: bool = False
    is_locked: bool = False
    permissions: List[str] = Field(default_factory=list)
    user_count: int = 0


class AccessRoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=300)
    permissions: List[str] = Field(default_factory=list)


class AccessRoleUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=300)
    permissions: List[str] = Field(default_factory=list)


# 答题活动


class QuizActivityQuestionStat(BaseModel):
    question_id: str
    question: str
    tag: str
    position: int
    random_clicks: int = 0
    hide_clicks: int = 0
    question_exists: bool = True


class QuizActivity(BaseModel):
    id: int
    name: str
    description: str = ""
    status: Literal["draft", "active", "paused", "ended"]
    created_by: str
    question_count: int = 0
    total_random_clicks: int = 0
    total_hide_clicks: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None


class QuizActivityDetail(QuizActivity):
    question_ids: List[str] = Field(default_factory=list)
    questions: List[QuizActivityQuestionStat] = Field(default_factory=list)


class QuizActivityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    question_ids: List[str] = Field(default_factory=list)


class QuizActivityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    question_ids: Optional[List[str]] = None


# 官网活动


class SiteEventMaterial(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    image: str = Field(default="", max_length=1000)
    icon: str = Field(default="✨", max_length=20)
    color: Literal["rose", "pink", "yellow", "blue", "indigo", "purple"] = "blue"


class SiteEventRules(BaseModel):
    enabled: bool = True
    title: str = Field(default="游戏玩法与规则", max_length=100)
    description: str = Field(default="", max_length=1000)
    link: str = Field(default="/rules", max_length=1000)
    link_label: str = Field(default="点击查看", max_length=50)
    icons: List[str] = Field(default_factory=lambda: ["🌙", "☀️", "🎭"], max_length=6)


class SiteEventCallToAction(BaseModel):
    title: str = Field(default="获取方式", max_length=100)
    description: str = Field(default="", max_length=2000)


class SiteEventFooter(BaseModel):
    title: str = Field(default="", max_length=100)
    copyright: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=500)


class SiteEventContent(BaseModel):
    eyebrow: str = Field(default="", max_length=100)
    title: str = Field(min_length=1, max_length=300)
    intro_title: str = Field(default="", max_length=200)
    intro: str = Field(default="", max_length=3000)
    rules: SiteEventRules = Field(default_factory=SiteEventRules)
    materials_title: str = Field(default="精彩物料一览", max_length=100)
    materials: List[SiteEventMaterial] = Field(default_factory=list, max_length=30)
    cta: SiteEventCallToAction = Field(default_factory=SiteEventCallToAction)
    footer: SiteEventFooter = Field(default_factory=SiteEventFooter)
    theme: Literal["aurora", "sunset", "ocean", "mint"] = "aurora"


class SiteEventBase(BaseModel):
    slug: str = Field(
        min_length=2,
        max_length=80,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    name: str = Field(min_length=1, max_length=100)
    date_label: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=100)
    content: SiteEventContent


class SiteEventCreate(SiteEventBase):
    pass


class SiteEventUpdate(BaseModel):
    slug: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=80,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    date_label: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=100)
    content: Optional[SiteEventContent] = None


class SiteEventSummary(BaseModel):
    id: int
    slug: str
    name: str
    date_label: str = ""
    location: str = ""
    status: Literal["draft", "published", "archived"]
    is_current: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SiteEvent(SiteEventSummary):
    content: SiteEventContent
    created_by: str
    published_at: Optional[str] = None


# 物料模型


class Material(BaseModel):
    id: str
    name: str
    description: str
    creator: List[str] = []  # 改为多选
    contributors: List[ContentContributor] = Field(default_factory=list)
    resources: List[str] = []


# 创建物料请求


class MaterialCreate(BaseModel):
    name: str
    description: str
    creator: List[str] = []
    contributor_ids: List[int] = Field(default_factory=list)
    resources: List[str] = []


# 更新物料请求


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    creator: Optional[List[str]] = None
    contributor_ids: Optional[List[int]] = None
    resources: Optional[List[str]] = None

class PaginatedQuestions(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Question]


class PaginatedMaterials(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Material]


# 系统配置相关模型


class ConfigUpdate(BaseModel):
    key: str
    value: str


class ConfigResponse(BaseModel):
    key: str
    value: str

# 角色技能详情模型
class RoleSkillDetail(BaseModel):
    title: str
    content: str

# 角色模型
class Role(BaseModel):
    id: Optional[int] = None
    name: str
    desc: str
    skill: str = "-"
    camp: str
    identity: str
    color: str
    skillDetails: List[RoleSkillDetail] = []
    image_url: Optional[str] = None

# 创建角色请求
class RoleCreate(BaseModel):
    name: str
    desc: str
    skill: str = "-"
    camp: str
    identity: str
    color: str
    skillDetails: List[RoleSkillDetail] = []
    image_url: Optional[str] = None

# 更新角色请求
class RoleUpdate(BaseModel):
    name: Optional[str] = None
    desc: Optional[str] = None
    skill: Optional[str] = None
    camp: Optional[str] = None
    identity: Optional[str] = None
    color: Optional[str] = None
    skillDetails: Optional[List[RoleSkillDetail]] = None
    image_url: Optional[str] = None
