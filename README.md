# 赵钧毅个人作品集主页

这是一个可以直接部署到 GitHub Pages 的静态个人主页。首页展示这些内容：

- 作品集项目：来自 `赵钧毅-作品集.pdf`，已按页码拆成 9 个项目 PDF，并自动生成封面。
- 论文与研究：来自 `heal.docx` 和 `Manuscript.docx`，已提取标题、摘要和部分图片。
- 获奖与实践经历：来自 `data/awards.json`，可逐条追加奖项、项目介绍和个人贡献。
- 个人简历：来自 `CV.pdf`。

## 本地预览

因为页面会读取 `data/*.json`，建议用本地服务器预览：

```powershell
python -m http.server 8000
```

然后浏览器打开：

```text
http://localhost:8000
```

## 你以后主要改哪里

### 1. 修改个人信息

打开：

```text
data/profile.json
```

建议你补充这些字段：

- `headline`：一句话身份，例如 `Architecture and Urban Computing Portfolio`
- `location`：城市或学校，例如 `Beijing, China`
- `school`：学校或机构，例如 `China University of Mining and Technology-Beijing`
- `bio`：2-4 句话个人介绍
- `softwareSkills`：软件技能列表，可以继续追加软件名、熟练度、说明和图标路径

现在能可靠填入的信息有：

- 姓名：赵钧毅
- 邮箱：zhaojunyi20040110@gmail.com
- 电话：18774986412

软件技能可以这样写：

```json
{
  "name": "Rhino",
  "level": "Advanced",
  "note": "Parametric modeling",
  "icon": "assets/icons/rhino.png"
}
```

如果暂时没有图标，`icon` 留空即可，网页会自动显示软件名称首字母。之后你可以把图标图片放到 `assets/icons/`，再把路径填进 `icon`。

简历 PDF 的中文文本自动提取出现编码问题，所以我没有把奖项、经历等内容硬塞进网页。你可以把简历里的教育经历、荣誉、技能整理后再发给我，我可以继续帮你做成更完整的网页模块。

### 2. 修改获奖与实践经历

打开：

```text
data/awards.json
```

每条获奖或实践经历可以这样写，网页会显示为英文的 `Awards & Practical Experience` 模块：

```json
{
  "title": "Award or Practice Experience Title",
  "date": "2026",
  "project": "Briefly introduce the project background, objective, design or research problem, and final outcome.",
  "contribution": "Describe your specific responsibilities, such as concept development, parametric modeling, data analysis, visualization, coordination, implementation, or presentation.",
  "tags": ["Award", "Project", "Role"]
}
```

你后续新增奖项时，只需要在数组里继续追加一个对象。`project` 写这个奖项项目的大致内容，`contribution` 写你具体做了什么；如果某条获奖没有项目介绍或个人贡献，可以直接删掉对应字段，网页会自动隐藏那一栏。

### 3. 修改作品标题和说明

打开：

```text
data/projects.json
```

每个作品长这样：

```json
{
  "slug": "project-01",
  "title": "作品 01",
  "summary": "项目标题和说明待补充。可在 data/projects.json 中修改。",
  "pages": "3-7",
  "cover": "assets/projects/project-01-cover.png",
  "pdf": "assets/projects/project-01.pdf",
  "tags": ["Portfolio"]
}
```

你只需要改：

- `title`：项目标题
- `summary`：项目简介，建议 1-3 句话
- `tags`：项目标签，例如 `["Urban Design", "Python", "Grasshopper"]`

不要改 `cover` 和 `pdf`，除非你替换了文件。

作品卡片现在默认打开网页式项目浏览页，例如：

```text
project.html?project=project-01
```

项目详情页会在简介下方显示 `keywords` 字段，可在 `data/projects.json` 中补充具体关键词。

### 4. 修改论文内容和封面

打开：

```text
data/papers.json
```

你可以修改：

- `title`：论文标题
- `summary`：论文摘要或主页展示说明
- `cover`：封面图片路径
- `images`：展示在论文卡片下面的小图

论文图片在：

```text
assets/papers/heal/
assets/papers/manuscript/
```

如果想换封面，把 `cover` 改成其中任意一张图片路径即可。

## 如果作品集 PDF 更新了怎么办

确认新的 `赵钧毅-作品集.pdf` 放在当前文件夹，然后运行：

```powershell
python tools/extract_assets.py
```

它会重新生成：

```text
assets/projects/
data/projects.json
data/papers.json
data/profile.json
```

注意：这个脚本会覆盖 `data/*.json`。如果你已经手动写好了标题和说明，运行脚本前先备份这些 JSON 文件。

## 发布到 GitHub Pages

1. 在 GitHub 创建一个仓库，仓库名必须是：

```text
你的GitHub用户名.github.io
```

2. 把这个文件夹里的内容上传到仓库根目录。
3. 进入仓库的 `Settings` -> `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。
6. 等几分钟后访问：

```text
https://SmallZhao-1.github.io
```

## 当前文件结构

```text
index.html          首页结构
styles.css          页面样式
scripts/main.js     读取 JSON 并生成项目卡片
data/               你主要编辑的数据
assets/             PDF、图片、简历、论文素材
tools/              自动拆分和提取素材的脚本
```

## 后续建议

下一步最值得补的是每个项目的真实标题、3 句话简介、你的角色和工具栈。你把这些内容发给我之后，我可以继续帮你把主页从“可展示版本”打磨成“申请/求职/作品集投递版本”。
