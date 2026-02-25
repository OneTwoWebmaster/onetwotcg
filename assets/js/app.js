const nav = document.querySelector('.template');

nav.innerHTML = `
    <img src="/assets/images/logo.png" height="35" />
    <a href="/">Home</a>
    <a href="/products/">Products</a>
    <a href="/cart/">Cart</a>
    <input type="text">
    <input type="submit" value="Search">
`