#!/usr/bin/env node
import { src, dest } from 'gulp';
import { program } from 'commander';
import { join, extname } from 'path'
import { readdirSync, existsSync, writeFileSync } from 'fs';
import ts from 'gulp-typescript';

const root = process.cwd();

program.version(`1.0.0`)
    .command(`build <source> [destination]`)
    .description(`构建云函数`)
    .action((path, destination) => {
        destination = destination || 'cloudfunctions';
        if (path) {
            const rootPath = join(root, path);
            scanDir(rootPath, destination)
        }
    })

program.parse(process.argv)

function scanDir(rootPath: string, destination: string) {
    const paths = readdirSync(rootPath);
    paths.map(path => {
        const _root = join(rootPath, path);
        const pkgJson = getPackageJson(_root);
        const tsconfigJson = getTsConfigJson(_root);
        const build = src([join(_root, `*.ts`), join(_root, "**/*.ts")])
            .pipe(
                ts({
                    noImplicitAny: true,
                    ...tsconfigJson.compilerOptions
                })
            )
            .pipe(dest(join(root, destination, path)));
        build.on('end', () => {
            const exe = extname(pkgJson.main);
            pkgJson.main = pkgJson.main.replace(`${exe}`, '.js');
            writeFileSync(join(root, destination, path, 'package.json'), JSON.stringify(pkgJson, null, 2))
        });
    })
}


function getPackageJson(path: string) {
    const filePath = join(path, 'package.json')
    if (existsSync(filePath)) {
        return require(filePath)
    }
    return undefined
}
function getTsConfigJson(path: string) {
    const filePath = join(path, 'tsconfig.json')
    if (existsSync(filePath)) {
        return require(filePath)
    }
    return undefined
}
