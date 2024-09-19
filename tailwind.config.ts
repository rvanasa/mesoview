import type { Config } from 'tailwindcss';
import flowbite from 'flowbite-react/tailwind';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}', flowbite.content()],
  theme: {
    extend: {
      colors: {
        background: '#FFF',
      },
    },
  },
  plugins: [flowbite.plugin()],
};
export default config;
