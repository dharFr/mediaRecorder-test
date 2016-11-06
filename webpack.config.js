module.exports = {
 entry: './src/main.js',
 output: {
   filename: 'dist/bundle.js'
 },
 module: {

   loaders: [
     {
       test: /\.js$/,
       exclude: /node_modules/,
       loader: 'babel-loader'
     }, {
       test: /\.svg$/,
       exclude: /node_modules/,
       loader: 'raw-loader'
     }
   ]
 },
 resolve: {
   extensions: ['', '.js', '.es6']
 },
 // debug: true,
 devtool: 'inline-source-map'
}