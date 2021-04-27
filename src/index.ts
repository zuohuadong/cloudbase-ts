#!/usr/bin/env node
import { src, dest, watch, task } from 'gulp';
import { program } from 'commander';
import { join } from 'path'
import { readdirSync, existsSync, writeFileSync } from 'fs';
import ts from 'gulp-typescript';

const root = process.cwd();

program.version(`1.0.0`)
    .option(`-d, --dev`, '开发模式')
    .command(`build <source> [destination]`)
    .description(`构建云函数`)
    .action((path, destination) => {
        const options = program.opts() as any;
        destination = destination || 'cloudfunctions';
        if (path) {
            const rootPath = join(root, path);
            scanDir(rootPath, destination, options.dev)
        }
    })

program.parse(process.argv)

function scanDir(rootPath: string, destination: string, isDev: boolean) {
    const paths = readdirSync(rootPath);
    const fns: Function[] = [];
    paths.map(path => {
        const _root = join(rootPath, path);
        const pkgJson = getPackageJson(_root);
        const tsconfigJson = getTsConfigJson(_root);
        const srcs = [join(_root, `*.ts`), join(_root, "**/*.ts")]
        const build = () => src(srcs)
            .pipe(
                ts({
                    noImplicitAny: true,
                    ...tsconfigJson.compilerOptions,
                })
            )
            .pipe(dest(join(root, destination, path)));
        const buildTask = () => {
            return new Promise((resolve, reject) => {
                build().on('end', () => {
                    pkgJson.main = `index.js`;
                    pkgJson.name = `${path}`;
                    writeFileSync(join(root, destination, path, 'package.json'), JSON.stringify(pkgJson, null, 2))
                    resolve(true);
                })
            })
        }
        fns.push(buildTask);
    })
    if (isDev) {
        watch([join(rootPath, '*.ts'), join(rootPath, '**/*.ts')], () => Promise.all(fns.map(fn => fn())));
    } else {
        Promise.all(fns.map(fn => fn()));
    }
}


function getPackageJson(path: string): any {
    const filePath = join(path, 'package.json')
    if (existsSync(filePath)) {
        return require(filePath)
    }
    if (path !== root) {
        const topPath = join(path, '..')
        return getPackageJson(topPath)
    }
    return undefined
}


function getTsConfigJson(path: string): any {
    const filePath = join(path, 'tsconfig.json')
    if (existsSync(filePath)) {
        return require(filePath)
    }
    if (path !== root) {
        const topPath = join(path, '..')
        return getTsConfigJson(topPath)
    }
    return undefined
}
