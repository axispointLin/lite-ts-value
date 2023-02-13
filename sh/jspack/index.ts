import { FileFactory } from 'lite-ts-fs';
import { IFileFactory } from 'lite-ts-fs/dist/i-file-factory';
import { join } from 'path';

const exportReg = /["|'](.*)["|']/;
const importReg = /import.*["|'](.*)["|']/;

// 要过滤的行
const ignoreLine = 'export {};';
// 已解析的文件
const parsedFiles: string[] = [];

const fsFactory: IFileFactory = new FileFactory();

/**
 * 解析整个目录，从该目录底下的 index.d.ts 的 export 内容一个一个解析过去
 * 
 * @param dirPath 目录地址
 * @returns 
 */
async function getDirContent(dirPath: string) {
    const path = join(dirPath, 'index.d.ts');
    const indexTsFile = fsFactory.buildFile(path);
    const dirExists = await indexTsFile.exists();
    if (!dirExists)
        return '';

    if (parsedFiles.includes(path))
        return '';
    parsedFiles.push(path);

    const indexTsFileContent = await indexTsFile.readString();
    const exportsArray = indexTsFileContent.split('\n');
    let content = '';
    for (const line of exportsArray) {
        const regRes = line.match(exportReg);
        if (regRes && regRes[1]) {
            const paths = regRes[1].split('/');
            if (!paths[paths.length - 1].endsWith('.d.ts'))
                paths[paths.length - 1] += '.d.ts';

            const filePath = join(dirPath, ...paths);
            if (parsedFiles.includes(filePath))
                continue;
            parsedFiles.push(filePath);

            const file = fsFactory.buildFile(filePath);
            const data = await file.readString();
            content += await getFileContent(data, dirPath) + '\n';
        } else if (line && line != ignoreLine) {
            content += line + '\n';
        }
    }
    return content;
}

/**
 * 获取文件的内容，如果有 import 那么把指定文件的内容拼接起来
 * 
 * @param fileContent 
 * @param dirPath 
 * @returns 
 */
async function getFileContent(fileContent: string, dirPath: string) {
    const arr = fileContent.split('\n');
    let content = '';
    for (const line of arr) {
        const regRes = line.match(importReg);
        if (regRes && regRes[1]) {
            const paths = regRes[1].split('/');
            const dirExists = await fsFactory.buildDirectory(join(dirPath, ...paths)).exists();
            if (dirExists) {
                content += await getDirContent(join(dirPath, ...paths)) + '\n';
            } else {
                if (!paths[paths.length - 1].endsWith('.d.ts'))
                    paths[paths.length - 1] += '.d.ts';

                const path = join(dirPath, ...paths);
                if (parsedFiles.includes(path))
                    continue;

                const file = fsFactory.buildFile(path);
                const fileExists = await file.exists();
                if (!fileExists) {
                    console.log(`无法处理 ${line}, 找不到文件: ${file.path}, 已跳过`);
                    continue;
                }

                parsedFiles.push(path);
                const data = await file.readString();
                if (data)
                    content += await getFileContent(data, dirPath) + '\n';
            }
        } else if (line && line != ignoreLine) {
            content += line + '\n';
        }
    }
    return content;
}

(async () => {
    const res = await getDirContent('dist');
    const pkg = await fsFactory.buildFile('package.json').read<{ name: string; }>();
    await fsFactory.buildFile(`${pkg.name}.d.ts`).write(
        res.replace(/export\ /g, '')
            .replace(/moment\.unitOfTime\.StartOf/g, 'string')
    );
})();