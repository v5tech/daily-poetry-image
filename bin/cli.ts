import { getImageBySentence } from "../src/get-up";
import type { Response } from "../src/types";
import path from "path";
import fs from "fs";
import stream from "stream";
import { promisify } from "util";

const pipeline = promisify(stream.pipeline);

let readmeContent = `
## daily-poetry-image

GENERATE_CONTENT

每天一句中国古诗词，生成 AI 图片 Powered by Bing DALL-E-3.

### 👉🏽 [Base On @liruifengv's daily-poetry-image](https://github.com/liruifengv/daily-poetry-image)

### 👉🏽 [Live](https://daily.fengj.link) https://daily.fengj.link

## 项目介绍

-   本项目是基于 [Bing Image DALL-E-3](https://www.bing.com/images/create) 生成的图片，每天一句中国古诗词作为 Prompt。
-   GitHub Action 自动触发。
-   诗词由[今日诗词](https://www.jinrishici.com/)提供 API。
-   网站使用 [Astro](https://astro.build) 构建。

## 订阅

你可以使用 RSS 订阅每天的诗词配图：https://daily.fengj.link/rss.xml

[如何用 RSS 订阅？](https://zhuanlan.zhihu.com/p/55026716)

## 截图

![图片列表](./screenshots/Snipaste_2023-12-28_21-00-26.png)

![图片详情](./screenshots/Snipaste_2023-12-28_21-00-53.png)

## 灵感来源

-   [yihong0618/2023](https://github.com/yihong0618/2023)

## License

MIT
`;


async function init() {
    const cwd = process.cwd();
    const argv = require("minimist")(process.argv.slice(2));

    if (argv.cookie) {
        try {
            const res: Response = await getImageBySentence(argv.cookie);
            console.log("Create Successful: ", res);

            // const outputPath = path.join(cwd, "website/public");

            // const imagesPath = path.join(outputPath, "images");
            // if (!fs.existsSync(imagesPath)) {
            //     fs.mkdirSync(imagesPath);
            // }

            // // 在 images 目录下，创建一个以时间戳命名的文件夹，将图片放入其中
            const imagesFolderName = Date.now().toString();
            // const imagesFolderPath = path.join(imagesPath, imagesFolderName);
            // if (!fs.existsSync(imagesFolderPath)) {
            //     fs.mkdirSync(imagesFolderPath);
            // }

            // // 将图片放入 images 目录下的文件夹中
            // res.images.forEach((image, index) => {
            //     // images 中是网络url，请求图片，将图片保存到 images 目录下的文件夹中
            //     const imageFileName = `${index}.jpg`;
            //     const imageFilePath = path.join(imagesFolderPath, imageFileName);

            //     // 下载图片
            //     fetch(image).then((res) => {
            //         if (!res.ok) throw new Error(`unexpected response ${res.statusText}`);
            //         // @ts-ignore
            //         pipeline(res.body, fs.createWriteStream(imageFilePath)).catch((e) => {
            //             console.error("Something went wrong while saving the image", e);
            //         });
            //     });
            // });

            // Get README.md path
            const readmePath = path.join(cwd, "README.md");

            // Get the current date and time
            const currentDate = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
            const outputData = {
                ...res,
                date: currentDate,
                localImagesPath: imagesFolderName,
            };

            const contentPath = path.join(cwd, "website/src/content/images");
            const contentFile = path.join(contentPath, `${imagesFolderName}.json`);
            fs.writeFileSync(contentFile, JSON.stringify(outputData));

            // Update README.md content

            // Generate markdown for the images
            const imageMarkdown = outputData.images.map((imagePath, index) => `![Image ${index + 1}](${imagePath})`).join("\n");

            // Replace GENERATE_CONTENT with the image markdown and current date
            const newContent = readmeContent.replace("GENERATE_CONTENT", `${imageMarkdown}\n\n${outputData.content}\\${outputData.origin} | ${outputData.author}\n\n最近一次生成时间: ${currentDate}`);

            // Write the updated content back to README.md
            await fs.promises.writeFile(readmePath, newContent);

            console.log("README.md updated successfully!");

            process.exit(0);

            // setTimeout(() => {
            //     // 为了让图片下载完毕，再退出进程
            //     process.exit(0);
            // }, 5000);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    } else {
        throw new Error("Please provide a cookie using the --cookie argument");
    }
}

init().catch((e) => {
    console.error(e);
});
