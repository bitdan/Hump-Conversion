import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'
import {fileURLToPath} from 'node:url'
import {loadEnv} from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routerPath = path.join(projectRoot, 'src', 'router', 'index.ts')
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml')
const robotsPath = path.join(projectRoot, 'public', 'robots.txt')

const sourceText = await fs.readFile(routerPath, 'utf8')
const sourceFile = ts.createSourceFile(routerPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

function propertyName(node) {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
    return undefined
}

function findProperty(object, name) {
    return object.properties.find((property) => (
        ts.isPropertyAssignment(property) && propertyName(property.name) === name
    ))
}

function stringProperty(object, name) {
    const property = findProperty(object, name)
    if (!property) return undefined
    return ts.isStringLiteralLike(property.initializer) ? property.initializer.text : undefined
}

function booleanProperty(object, name) {
    const property = findProperty(object, name)
    if (!property) return undefined
    if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) return true
    if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) return false
    return undefined
}

function objectProperty(object, name) {
    const property = findProperty(object, name)
    return property && ts.isObjectLiteralExpression(property.initializer) ? property.initializer : undefined
}

function arrayProperty(object, name) {
    const property = findProperty(object, name)
    return property && ts.isArrayLiteralExpression(property.initializer) ? property.initializer : undefined
}

function joinRoutePath(parentPath, routePath) {
    if (routePath.startsWith('/')) return routePath
    return `${parentPath.replace(/\/$/, '')}/${routePath}`
}

function collectIndexableRoutes(routeArray, parentPath = '', parentRequiresAuth = false) {
    const paths = []

    for (const element of routeArray.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue

        const routePath = stringProperty(element, 'path')
        if (routePath === undefined) continue

        const fullPath = joinRoutePath(parentPath, routePath)
        const meta = objectProperty(element, 'meta')
        const requiresAuth = parentRequiresAuth || (meta ? booleanProperty(meta, 'requiresAuth') === true : false)
        const robots = meta ? stringProperty(meta, 'robots') : undefined
        const isRedirect = Boolean(findProperty(element, 'redirect'))
        const hasComponent = Boolean(findProperty(element, 'component'))
        const isStaticPath = !fullPath.includes(':') && !fullPath.includes('*')
        const isAuthPage = fullPath === '/auth' || fullPath.startsWith('/auth/')

        if (hasComponent && !isRedirect && isStaticPath && !isAuthPage && !requiresAuth && !robots?.includes('noindex')) {
            paths.push(fullPath || '/')
        }

        const children = arrayProperty(element, 'children')
        if (children) paths.push(...collectIndexableRoutes(children, fullPath, requiresAuth))
    }

    return paths
}

let routesArray

function findRoutesArray(node) {
    if (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.name.text === 'routes'
        && node.initializer
        && ts.isArrayLiteralExpression(node.initializer)
    ) {
        routesArray = node.initializer
        return
    }
    ts.forEachChild(node, findRoutesArray)
}

findRoutesArray(sourceFile)

if (!routesArray) {
    throw new Error(`Cannot find the routes array in ${routerPath}`)
}

const productionEnv = loadEnv('production', projectRoot, '')
const siteUrl = (process.env.SITE_URL || productionEnv.VITE_SITE_URL || 'http://tool.linger.host').replace(/\/+$/, '')
const routePaths = [...new Set(collectIndexableRoutes(routesArray))]
const urls = routePaths.map((routePath) => `${siteUrl}${routePath === '/' ? '/' : routePath}`)
const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `    <url><loc>${url.replaceAll('&', '&amp;')}</loc></url>`),
    '</urlset>',
    ''
].join('\n')

await fs.writeFile(sitemapPath, xml, 'utf8')
await fs.writeFile(robotsPath, `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8')
console.log(`Generated sitemap and robots.txt with ${urls.length} URLs for ${siteUrl}`)
