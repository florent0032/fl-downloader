# 🎬 FL-Downloader

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/florent0032/fl-downloader?style=social)
![GitHub forks](https://img.shields.io/github/forks/florent0032/fl-downloader?style=social)
![GitHub issues](https://img.shields.io/github/issues/florent0032/fl-downloader)
![GitHub license](https://img.shields.io/github/license/florent0032/fl-downloader)

**一个现代化的 yt-dlp Web 界面，让视频下载变得简单优雅**

[功能特点](#-功能特点) • [快速开始](#-快速开始) • [技术栈](#-技术栈) • [使用说明](#-使用说明) • [贡献指南](#-贡献指南)

</div>

---

## 📖 简介

FL-Downloader 是一个基于 yt-dlp 的现代化 Web 下载器，提供了美观易用的界面，支持多种视频平台的内容下载。告别命令行，让下载变得轻松愉快！

## ✨ 功能特点

- 🎯 **简单易用** - 直观的 Web 界面，复制链接即可下载
- 🚀 **高性能** - 基于 FastAPI 和 Next.js，响应迅速
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🎨 **现代化 UI** - 使用 Tailwind CSS 打造精美界面
- 📊 **下载记录** - 自动保存下载历史，方便管理
- ⚙️ **灵活配置** - 支持自定义下载设置
- 🔄 **实时状态** - 实时显示下载进度和状态
- 🌐 **多平台支持** - 支持 YouTube、Bilibili 等众多平台

## 🛠️ 技术栈

<div align="center">

### 前端
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)

### 后端
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt-dlp-FF0000?style=for-the-badge&logo=youtube&logoColor=white)

</div>

## 🚀 快速开始

### 前置要求

- Python 3.10+
- Node.js 18+
- yt-dlp (`pip install yt-dlp`)
- ffmpeg (推荐)

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/florent0032/fl-downloader.git
   cd fl-downloader
   ```

2. **使用启动脚本**（推荐）

   **Linux / macOS:**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

   **Windows:**
   ```cmd
   start.bat
   ```

3. **手动安装**（可选）

   **启动后端:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   python main.py
   ```

   **启动前端:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **访问应用**
   
   打开浏览器访问 http://localhost:3200

## 📁 项目结构

```
fl-downloader/
├── frontend/                 # Next.js 前端
│   ├── src/
│   │   ├── app/             # 页面组件
│   │   ├── components/      # UI 组件
│   │   └── lib/             # 工具函数
│   └── package.json         # 前端依赖
├── backend/                  # FastAPI 后端
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑
│   ├── models.py            # 数据模型
│   └── main.py              # 入口文件
├── start.sh                  # Linux/Mac 启动脚本
├── start.bat                 # Windows 启动脚本
└── README.md                 # 项目说明
```

## 📖 使用说明

### 🎬 下载视频

1. 在首页输入视频链接（支持 YouTube、Bilibili、Twitter 等）
2. 点击"解析"获取视频信息
3. 选择下载格式和质量
4. 点击下载按钮
5. 实时查看下载进度

### 📋 下载记录

- 所有下载记录都会自动保存
- 可以在"下载记录"页面查看历史
- 支持搜索、筛选和批量删除

### ⚙️ 设置配置

- 安装/更新 yt-dlp
- 查看系统日志
- 自定义下载目录

## 🔧 配置说明

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 后端端口 | `8200` | 在 `backend/main.py` 中修改 |
| 前端端口 | `3200` | 在 `frontend/package.json` 中修改 |
| 下载路径 | `./downloads` | 在界面或 API 中修改 |
| 数据库 | `./data/yt-dlp-web.db` | SQLite，自动创建 |

## 🌐 支持平台

YouTube, Bilibili, Twitter/X, TikTok, Vimeo, Twitch 等 [1000+ 平台](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发计划

- [ ] 添加更多视频平台支持
- [ ] 实现批量下载功能
- [ ] 添加下载队列管理
- [ ] 支持视频格式转换
- [ ] 添加用户系统
- [ ] 支持插件扩展

## 🐛 问题反馈

如果你遇到任何问题或有改进建议，请 [开启 Issue](https://github.com/florent0032/fl-downloader/issues)。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Next.js](https://nextjs.org/) - React 框架
- [FastAPI](https://fastapi.tiangolo.com/) - 现代 Python Web 框架
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

---

<div align="center">

**如果觉得有用，请给个 ⭐️ 支持一下！**

Made with ❤️ by [florent0032](https://github.com/florent0032)

</div>
