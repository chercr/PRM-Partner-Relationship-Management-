# 渠成 Channel OS 介绍网站

独立的多页面静态网站，不依赖业务系统运行，也不包含真实业务数据。

## 页面

- `index.html`：首页与产品界面示意
- `features.html`：已实现功能与当前边界
- `scenarios.html`：适用团队、工作流程与不适合的需求
- `deploy.html`：服务器配置、Docker、密码、备份与 HTTPS
- `download.html`：GitHub、ZIP、Git 克隆与部署入口
- `assets/partner-import-template.xlsx`：不含真实业务数据的 Excel 导入模板，保留所需工作表、表头和评分列

## 本地预览

在项目根目录执行：

```bash
npm run preview:website
```

打开 `http://127.0.0.1:4173`。保持预览服务运行，并执行 `npm run test:website` 可检查全部页面、内部链接、交互和移动端布局。

## 部署

整个 `website/` 目录可直接发布到静态网站托管、Nginx、对象存储静态托管或 GitHub Pages。所有页面链接均为相对路径，无需 Node.js 服务端渲染。

界面演示使用虚拟名称与数字，不对应真实客户、伙伴或实际业绩。网站不使用虚构客户评价、客户 Logo、市场排名或效果承诺。
