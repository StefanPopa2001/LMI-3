'use client';
import React from 'react';
import { getThemedClasses, useThemeColors } from '../../utils/themeUtils';

/**
 * Example component demonstrating the centralized theming system
 * This serves as a reference for how to use the theme utilities
 */
export default function ThemeExample() {
  const { colors, getStatusColor } = useThemeColors();

  return (
    <div className={getThemedClasses.page.container}>
      <div className={getThemedClasses.page.header}>
        <h1 className="text-2xl font-bold theme-text-primary">
          Theme System Example
        </h1>
        <p className="theme-text-secondary mt-2">
          Demonstrating the centralized color and theming system
        </p>
      </div>

      <div className={getThemedClasses.page.content}>
        {/* Color Palette Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className={getThemedClasses.card.base}>
            <div className={getThemedClasses.card.header}>
              <h3 className="font-semibold theme-text-primary">Primary Colors</h3>
            </div>
            <div className={getThemedClasses.card.body}>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: colors.primary.main }}
                  ></div>
                  <span className="theme-text-secondary">Primary: {colors.primary.main}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: colors.secondary.main }}
                  ></div>
                  <span className="theme-text-secondary">Secondary: {colors.secondary.main}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={getThemedClasses.card.base}>
            <div className={getThemedClasses.card.header}>
              <h3 className="font-semibold theme-text-primary">Background Colors</h3>
            </div>
            <div className={getThemedClasses.card.body}>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: colors.background.default }}
                  ></div>
                  <span className="theme-text-secondary">Primary BG: {colors.background.default}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: colors.background.paper }}
                  ></div>
                  <span className="theme-text-secondary">Paper BG: {colors.background.paper}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={getThemedClasses.card.base}>
            <div className={getThemedClasses.card.header}>
              <h3 className="font-semibold theme-text-primary">Status Colors</h3>
            </div>
            <div className={getThemedClasses.card.body}>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: getStatusColor('success') }}
                  ></div>
                  <span className="theme-text-secondary">Success</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: getStatusColor('error') }}
                  ></div>
                  <span className="theme-text-secondary">Error</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: getStatusColor('warning') }}
                  ></div>
                  <span className="theme-text-secondary">Warning</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Type Colors */}
        <div className={getThemedClasses.card.base}>
          <div className={getThemedClasses.card.header}>
            <h3 className="font-semibold theme-text-primary">Card Type Colors</h3>
          </div>
          <div className={getThemedClasses.card.body}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(colors.cards).map(([type, color]) => (
                <div key={type} className="text-center">
                  <div
                    className="w-12 h-12 rounded-lg mx-auto mb-2 border-2 border-white/20"
                    style={{ backgroundColor: color }}
                  ></div>
                  <p className="text-sm font-medium theme-text-primary capitalize">{type}</p>
                  <p className="text-xs theme-text-tertiary">{color}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className={getThemedClasses.card.base}>
            <div className={getThemedClasses.card.header}>
              <h3 className="font-semibold theme-text-primary">Button Examples</h3>
            </div>
            <div className={getThemedClasses.card.body}>
              <div className="space-y-3">
                <button className={getThemedClasses.button.primary}>
                  Primary Button
                </button>
                <button className={getThemedClasses.button.secondary}>
                  Secondary Button
                </button>
                <button className={getThemedClasses.button.success}>
                  Success Button
                </button>
                <button className={getThemedClasses.button.danger}>
                  Danger Button
                </button>
              </div>
            </div>
          </div>

          <div className={getThemedClasses.card.base}>
            <div className={getThemedClasses.card.header}>
              <h3 className="font-semibold theme-text-primary">Form Examples</h3>
            </div>
            <div className={getThemedClasses.card.body}>
              <div className="space-y-4">
                <div>
                  <label className={getThemedClasses.form.label}>Example Input</label>
                  <input
                    type="text"
                    className={`mt-1 block w-full rounded-md ${getThemedClasses.form.input} focus:ring-2`}
                    placeholder="Type something..."
                  />
                </div>
                <div>
                  <label className={getThemedClasses.form.label}>Select Example</label>
                  <select className={`mt-1 block w-full rounded-md ${getThemedClasses.form.input}`}>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className={getThemedClasses.card.base + ' mt-8'}>
          <div className={getThemedClasses.card.header}>
            <h3 className="font-semibold theme-text-primary">Status Indicators</h3>
          </div>
          <div className={getThemedClasses.card.body}>
            <div className="flex flex-wrap gap-4">
              <span className={getThemedClasses.status.success}>Success</span>
              <span className={getThemedClasses.status.error}>Error</span>
              <span className={getThemedClasses.status.warning}>Warning</span>
              <span className={getThemedClasses.status.info}>Info</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
