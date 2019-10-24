const path = require('path');

module.exports = {
    entry: {
        os: './src/app.ts',
        osLib: './src/App/lib.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devtool: "source-map",
    devServer: {
        contentBase: path.resolve(__dirname, "dist"),
        port: 9546,
    },
};