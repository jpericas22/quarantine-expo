const path = require('path');

module.exports = {
	mode: 'production',
	context: path.resolve(__dirname, './js'),
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, './js/build'),
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|lib|build)/,
				use: {loader: 'babel-loader'}
			},
			{
				test: /\.(vert|frag)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'raw-loader',
					}
				]
			}
		]
	},
	//devtool: "eval-source-map",
	performance: {
		hints: false,
		maxEntrypointSize: 512000,
		maxAssetSize: 512000
	}
};
