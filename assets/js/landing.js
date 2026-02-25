const divLanding = document.querySelector('#landing');
const changeButton = document.querySelector('#landingButton');
const productName = document.querySelector('#productName');
const numberStock = document.querySelector('#numberStock');

const landingState = {
    message: "Sword & Shield Base Booster Box",
    count: 10,
    products: [
        {
            name: "Scarlet & Violet Base Booster Pack",
            price: 499,
            stock: 36,
            images: [
                "/assets/images/scarlet-violet-booster-pack-01.jpg",
                "/assets/images/scarlet-violet-booster-pack-02.jpg",
                "/assets/images/scarlet-violet-booster-pack-03.jpg",
                "/assets/images/scarlet-violet-booster-pack-04.jpg"
            ],
            description: "Includes 36 booster packs from the Pokémon TCG: Scarlet & Violet expansion. Each booster pack contains 10 cards and 1 Basic Energy. Cards vary by pack."
        }
    ]
};

const renderLandingPage = (landingState) => {
    productName.textContent = landingState.message;
    if (landingState.count === 0) {
        numberStock.textContent = 'Out of stock';
    } else if (landingState.count > 0) {
        numberStock.textContent = `${landingState.count} in stock`;
    }
}

const setState = updater => {
    updater(landingState);
    renderLandingPage(landingState);
}

renderLandingPage(landingState);

changeButton.addEventListener("click", () => {
    setState( (state) => {
        state.message = "Fuck you all....";
        state.count -= 1;
    })
})