var express = require("express");
var axios = require("axios");
var router = express.Router();

module.exports = function (app) {
  /* GET home page. */
  router.get("/", function (req, res, next) {
    res.render("issues", {});
  });

  router.get("/issues", (req, res, next) => {
    const { page = 1, per_page = 20 } = req.query || {};
    var config = {
      method: "get",
      url: `https://gitlab.com/api/v4/projects/${process.env.GITLAB_PROJECT_ID}/issues?page=${page}&per_page=${per_page}`,
      headers: {
        Authorization: `Bearer ${process.env.GITLAB_PERSONAL_ACCESS_TOKEN}`,
      },
    };
    console.log(config);

    axios(config)
      .then(function (response) {
        console.log(response);
        // console.log(JSON.stringify(response.data));
        // res.render("issues", { issues: response.data });
        const { headers } = response;
        const totalPages = headers["x-total-pages"];
        const totalIssues = headers["x-total"];
        // const totalPage = headers["x-total-pages"];
        return res.status(200).json({
          error: false,
          data: { issues: response.data, totalPages, totalIssues },
        });
      })
      .catch(function (error) {
        console.log(error);
        return res.status(400).json({
          error: true,
          messgae: "Something went wrong",
        });
      });
  });

  router.post("/webhook/new-issue", (req, res, next) => {
    try {
      console.log("Headers: ", req.headers);
      const gitlabEvent = req.headers["x-gitlab-event"];
      const gitlabToken = req.headers["x-gitlab-token"];
      if (gitlabEvent !== "Issue Hook") return;
      if (gitlabToken !== process.env.GITLAB_SECRET_TOKEN) return;
      console.log("Body: ", req.body);
      const {
        event_type,
        user: { name, username },
        project: { id: projectId },
        changes,
      } = req.body;
      if (event_type !== "issue") return;
      if (`${projectId}` !== process.env.GITLAB_PROJECT_ID) return;

      const newIssue = Object.keys(changes).reduce((issue, key) => {
        issue[key] = changes[key]?.current;
        return issue;
      }, {});
      newIssue["author"] = {};
      newIssue["author"]["name"] = name;
      app.io.emit("issue-event", { issue: newIssue });
      return res.status(200).json();
    } catch (error) {
      console.log(error);
    }
  });

  return router;
};
