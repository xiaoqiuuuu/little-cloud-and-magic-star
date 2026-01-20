from pydantic import BaseModel
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
    username: str
    password: str

# Token响应


class Token(BaseModel):
    access_token: str
    token_type: str


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


class ProducerCreate(BaseModel):
    name: str
    profile_url: Optional[str] = None


class ProducerUpdate(BaseModel):
    name: Optional[str] = None
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
