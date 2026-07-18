from pydantic import BaseModel, Field
from typing import List, Optional, Literal

# 题目模型


class Question(BaseModel):
    id: str
    question: str
    answer: str
    resources: List[str] = []
    tag: Literal["concert", "vlog", "common"]
    author: List[str] = []  # 改为多选
    random_clicks: int = 0
    hide_clicks: int = 0

# 创建题目请求


class QuestionCreate(BaseModel):
    question: str
    answer: str
    resources: List[str] = []
    tag: Literal["concert", "vlog", "common"]
    author: List[str] = []

# 更新题目请求


class QuestionUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    resources: Optional[List[str]] = None
    tag: Optional[Literal["concert", "vlog", "common"]] = None
    author: Optional[List[str]] = None

# 批量导入题目项


class QuestionImportItem(BaseModel):
    id: Optional[str] = None  # 如果有ID则更新，否则创建
    question: str
    answer: str
    resources: List[str] = []
    tag: Literal["concert", "vlog", "common"] = "common"
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


class AdminUser(BaseModel):
    id: int
    username: str
    role: Literal["super_admin", "question_admin"]
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["super_admin", "question_admin"] = "question_admin"


class AdminUserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    role: Optional[Literal["super_admin", "question_admin"]] = None
    is_active: Optional[bool] = None


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=128)


# 物料模型


class Material(BaseModel):
    id: str
    name: str
    description: str
    creator: List[str] = []  # 改为多选
    resources: List[str] = []


# 创建物料请求


class MaterialCreate(BaseModel):
    name: str
    description: str
    creator: List[str] = []
    resources: List[str] = []


# 更新物料请求


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    creator: Optional[List[str]] = None
    resources: Optional[List[str]] = None

# 制作人模型


class Producer(BaseModel):
    id: int
    name: str
    profile_url: Optional[str] = None


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


class PaginatedProducers(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Producer]


class ProducerCreate(BaseModel):
    name: str
    profile_url: Optional[str] = None


class ProducerUpdate(BaseModel):
    name: Optional[str] = None
    profile_url: Optional[str] = None

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
