export default [{
    input: 'src/mini-3d/loader/index.js',
    output: {
        name: 'Mini3DLoader',
        file: 'loader.js',
        format: 'cjs',
        indent: false,
        sourcemap: false
    },
    external: ['fs', 'worker_threads', 'https'],
}];
