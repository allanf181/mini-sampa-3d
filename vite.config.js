import { replaceCodePlugin } from "vite-plugin-replace";

module.exports = {
    plugins: [
        replaceCodePlugin({
            replacements: [
                {
                    from: "1.01*",
                    to: "2*",
                }
            ],
        }),
    ],
}
