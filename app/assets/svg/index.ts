/**
 * SVG 图标桶文件（vite-svg-loader 组件化，defaultImport:'component'）
 * import.meta.glob 自动收集 ./icon-*.svg：新增图标文件即自动注册，无需改此文件
 * 图标描边均为 currentColor：颜色跟随文字色，暗色主题自动适配（见 main.css）
 */
import type { Component } from 'vue'

const modules = import.meta.glob<{ default: Component }>('./icon-*.svg', {
  eager: true,
})

/** 文件名 → 组件名：'./icon-plus.svg' → 'IconPlus' */
function toPascalName(path: string): string {
  return path
    .replace(/^\.\//, '')
    .replace(/\.svg$/, '')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

/** 全部图标集合：{ IconPlus: Component, ... }，新图标直接 icons.IconXxx 取用 */
export const icons: Record<string, Component> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [toPascalName(path), mod.default]),
)

// 常用图标具名导出（模板中 import { IconXxx } from '~/assets/svg' 使用）
export const IconPlus = icons.IconPlus
export const IconSettings = icons.IconSettings
export const IconSend = icons.IconSend
export const IconSearch = icons.IconSearch
export const IconEye = icons.IconEye
export const IconExplore = icons.IconExplore
export const IconCapability = icons.IconCapability
export const IconLimitation = icons.IconLimitation
export const IconMessage = icons.IconMessage
