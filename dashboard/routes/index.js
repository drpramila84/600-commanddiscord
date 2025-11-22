const express = require("express"),
  CheckAuth = require("../auth/CheckAuth"),
  router = express.Router();

router.get("/", async (req, res) => {
  if (req.session.user) {
    return res.redirect("/selector");
  }
  res.render("home");
});

router.get("/selector", CheckAuth, async (req, res) => {
  res.render("selector", {
    user: req.userInfos,
    currentURL: `${req.client.config.DASHBOARD.baseURL}/${req.originalUrl}`,
  });
});

// Keep-alive endpoint for UptimeRobot
router.get("/ping", async (req, res) => {
  res.status(200).send("Bot is alive! 🤖");
});

module.exports = router;
