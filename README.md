# Tensorbytes (小名广告生成平台) - 前后端交互接口文档

本文档旨在梳理 **Tensorbytes** 平台的前端与后端（及 AI 智能体）之间的核心交互逻辑与接口定义。

## 1. 业务流程概览

1.  **需求分析阶段**：前端将用户输入的原始需求（文本+图片）发送至 AI 解析接口。
2.  **方案确认阶段**：AI 返回结构化的 Markdown 方案，用户核对并设置生成参数（如版本数量）。
3.  **批量生成阶段**：前端提交生成任务，进入后台任务队列。
4.  **状态轮询阶段**：前端实时跟踪各任务的生成进度（排队、生成中、完成）。
5.  **交付导出阶段**：用户通过工作区预览视频，并支持一键导出打包。

---

## 2. 核心数据模型 (Data Schemas)

### 2.1 视频任务 (VideoTask)
```typescript
interface VideoTask {
  id: string;          // 任务唯一ID
  title: string;       // 视频标题（基于需求主题）
  type: VideoType;     // 视频类型: 'text_poster' (大字报) | 'ecommerce' (电商)
  model: ModelType;    // 模型: 'seedance' | 'veo3'
  status: TaskStatus;  // 状态: 'queued' | 'generating' | 'completed' | 'failed'
  createdAt: number;   // 创建时间戳
  url?: string;        // 生成后的视频下载地址 (S3/OSS URL)
  thumbnail?: string;  // 视频封面/预览图地址
  progress?: number;   // 0-100 的生成进度
  duration?: string;   // 视频时长 (例如 "00:15")
  size?: string;       // 文件大小 (例如 "2.4 MB")
}
```

### 2.2 聊天消息 (ChatMessage)
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;         // 文本内容或 Markdown 方案
  type?: VideoType;        // 关联的视频类型
  model?: ModelType;       // 关联的模型
  attachments?: string[];  // 附件图片 URL 列表
  isConfirmation?: boolean;// 是否为待确认的方案消息
}
```

---

## 3. 接口详细定义

### 3.1 需求深度解析 (AI Agent Analysis)
*   **功能**：调用 Gemini 模型，将用户非结构化的描述转化为专业的广告制作方案。
*   **调用逻辑**：前端在 `handleSend` 方法中触发。
*   **输入参数**：
    *   `inputText`: 原始需求文本（限制 200/500 字）。
    *   `videoType`: 选定的广告模板。
    *   `modelType`: 指定的生成模型。
    *   `attachments`: 已上传的图片 Base64 或临时 URL。
*   **预期输出**：格式化的 Markdown 字符串，包含：项目分析、创意策略、视觉指导。

### 3.2 任务提交接口 (Task Creation)
*   **功能**：确认方案后，正式创建批量生成任务。
*   **调用逻辑**：点击“确认并开始生成”按钮触发 `confirmGeneration`。
*   **请求负荷 (Payload)**：
    ```json
    {
      "specId": "string",      // 解析方案的ID
      "versionCount": number,  // 1-100 的生成数量
      "videoType": "string",
      "modelType": "string",
      "assets": ["url1", "url2"] // 原始参考素材
    }
    ```
*   **响应**：返回生成的 `VideoTask[]` 初始状态列表。

### 3.3 任务进度同步 (Status Polling)
*   **功能**：实时更新右侧工作区的任务进度。
*   **实现方式**：目前在前端通过 `setInterval` 模拟，生产环境建议使用 **WebSocket** 或 **SSE (Server-Sent Events)**。
*   **状态转换逻辑**：
    1.  `queued` (排队): 任务已入队。
    2.  `generating` (生成中): 智能体正在渲染视频（progress 增加）。
    3.  `completed` (已完成): 返回视频 `url` 和 `thumbnail`。
    4.  `failed` (失败): 返回错误原因。

### 3.4 一键导出功能 (Batch Export)
*   **功能**：将当前所有已完成的任务打包下载。
*   **调用逻辑**：工作区顶栏 `handleExportAll`。
*   **接口行为**：
    *   前端收集所有 `status === 'completed'` 的视频 URL。
    *   后端触发打包服务，生成 ZIP 包并返回临时下载链接。

---

## 4. 交互视觉规范 (Manus Style)

*   **右侧工作区 (Workspace)**：
    *   `document` 模式：渲染解析后的 Markdown。
    *   `files` 模式：采用 24px 圆角卡片流，展示视频封面、进度条和操作项。
*   **导航栏 (Browser UI)**：
    *   提供虚拟的 URL 路径（如 `workspace/files`）增强沉浸式工作感。
    *   具备刷新、后退等操作逻辑。

---

## 5. 安全与限制
*   **API Key 管理**：前端通过 `process.env.API_KEY` 安全注入，不暴露在客户端源码中。
*   **输入限制**：前端通过 `textarea` 的 `slice` 强制截断，后端应具备二次校验。
*   **并发控制**：生成任务支持批量（最高 100 个），后端需具备高并发队列管理能力。