/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/components/**/*.{js,vue,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#409EFF',
        success: '#67C23A',
        warning: '#E6A23C',
        danger: '#F56C6C',
      },
      screens: {
        xs: '768px',
        sm: '768px',
        md: '992px',
        lg: '1200px',
        xl: '1920px',
      },
    },
  },
  plugins: [],
};
