import buble from 'rollup-plugin-buble'
import { terser } from 'rollup-plugin-terser'

export default {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/index.js',
            format: 'cjs',
            sourcemap: true
        },
        {
            file: 'browser/diffDOM.js',
            format: 'iife',
            name: 'diffDOM',
            sourcemap: true
        },
    ],
    plugins: [
        buble(),
        terser()
    ]
}
