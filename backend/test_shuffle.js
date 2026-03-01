const { getRecommendationsForMood } = require('./recommender');

(async () => {
    console.log("TEST 1: Happy & Joyful");
    const res1 = await getRecommendationsForMood('Happy & Joyful', 5);
    console.log(res1.map(t => t.track_name));

    console.log("\nTEST 2: Happy & Joyful");
    const res2 = await getRecommendationsForMood('Happy & Joyful', 5);
    console.log(res2.map(t => t.track_name));
})();
