## 目录结构

```
frontend/                       # 前端代码目录
├── public/                     # 静态资源目录
│   ├── assets/                 # 静态资源
│   │   ├── images/             # 图片
│   │   ├── script/
│   │   |   └── script.js       # 逻辑处理
│   │   └── styles/
│   │       └── styles.css      # 样式
│   └── index.html              # 主页面
└── README.md                   # 当前文档
```

当前目录为 RAG 应用项目的**前端**部分。

### 启动方式

需要安装依赖

```shell
npm install --global serve
```

推荐使用 rag 目录下的 `run.py` 脚本启动前后端。

单独启动前端方式可选如下：  
1. 直接打开 `index.html` 。
2. 在 frontend 目录下使用命令启动：

```cmd
serve -s public
```