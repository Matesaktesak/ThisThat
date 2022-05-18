const express = require("express");
const http = require('http');
const fs = require("fs");
const qs = require('querystring');
request = require('request');
const app = express();

const httpPort = 3002;
const ip = "localhost";

const secretkey = fs.readFileSync('./certs/recaptcha_secretkey');
const sitekey = fs.readFileSync('./certs/recaptcha_sitekey');

let httpServer = http.createServer(app);

//----------------------------------------

app.engine('.html', require('ejs').__express);  // Rendering engine setup
app.set('view engine', 'html');

app.use(express.static("content"));   // Serve stylesheets and images and so on using expressed static workflow

// Index page
app.get("/", (req, res) => res.render("index", {title: "This That", sitekey: sitekey}));

// 404 - just let it fall trough - nothing is gonna catch it anyway
app.get("/404", (req, res, next) => next());

// 403
app.get("/403", (req, res, next) => {
    let err = new Error('Not allowed!');
    err.status = 403;
    next(err);
});

// 500
app.get('/500', (req, res, next) => {
    let err = new Error('Unknown internal server error...');
    err.status = 500;
    next(err);
});


app.post("/poll", (req, res) => {
    let postdata = "";
    req.on("data", function (chunk) {
        postdata += chunk.toString();
        if (postdata.length > 1e3) req.socket.destroy(); // Prevent requests over 1kB
    });

    req.on("end", function () {
        let post = qs.parse(postdata);
        res.redirect("/poll/" + post.poll.toString());
    });
});

// Evaluate request with a poll vote incoming
app.post("/poll/:pollcode/", (req, res, next) => {
    let pollcode = req.params["pollcode"];
    let polldataFile = "./polldata/" + pollcode.toString() + ".json";

    let postdata = "";
    req.on("data", function (chunk) {
        postdata += chunk.toString();
        if (postdata.length > 1e5) req.socket.destroy(); // Prevent requests over 100kB
    });

    req.on("end", function () {
        let post = qs.parse(postdata);
        
        if(!post.token){
            console.log("A vote was cast without a CAPTCHA - not responding!");
            next();
        } else {        // If we got a captcha token
            const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretkey}&response=${post.token}&remoteip=${req.headers['x-forwarded-for']}`;

            request(verificationURL, (error, response, body) => {
                body = JSON.parse(body);
                console.log("Choice: " + post.choice);
                console.log("Other: " + post.other);
                console.log("IP: " + req.headers['x-forwarded-for']);
                console.log("Captcha score: " + body.score);
                console.log("--")
                if (body.success && body.score > 0.5 && body.score != undefined) {       // If the CAPTCHA was sucessfull
                    fs.readFile(polldataFile, 'utf8', (err, polldata) => {
                        if (!err) {
                            polldata = JSON.parse(polldata);
                            let content = polldata.content;

                            // Registering a vote
                            if (polldata.active && content[post.choice] != null && content[post.other] != null && post.choice != "" && post.other != "") {
                                content[post.choice] += 1;
                                content[post.other] -= 0.5;
                                polldata.totalVotes += 1;
                                fs.writeFileSync(polldataFile, JSON.stringify(polldata, null, 2));

                            } else {
                                console.log("Request invalid - do nothing");
                                console.log(post);
                            }

                            // Sending new poll
                            let a = Math.floor(Math.random() * Object.keys(content).length);
                            let b = a;
                            while (b == a) b = Math.floor(Math.random() * Object.keys(content).length);

                            let filteredResults = null;
                            if (polldata.results) {
                                filteredResults = Object.entries(things).sort(([, a], [, b]) => b - a);
                                let places = filteredResults.length;

                                for (let i = polldata.resultPlaces; i < places; i++) {
                                    filteredResults.pop();
                                }
                            }

                            res.json({
                                pollname: polldata.name,
                                totalVotes: polldata.totalVotes,
                                btn1: Object.keys(content)[a],
                                btn2: Object.keys(content)[b],
                                success: true
                            });

                        } else {
                            console.log("Poll data file (" + polldataFile.toString() + ") was not found - responding 404");
                            next();
                        }
                    });
                } else {
                    res.json({
                        success: false
                    })
                    console.log("Request rejected due to CAPTCHA invalidity... \r \n--");
                }
            });
        }
    });
});

// Poll request with no answer
app.get("/poll/:pollcode/", (req, res, next) => pollPage(req, res, next));

// Poll request with results override
app.get("/overrideresultsenable/:pollcode/", (req, res, next) => pollPage(req, res, next, true));

// When no poll code is supplied
app.get("/poll", (req, res) => res.redirect("/"));

// Reset all poll keys to zero
app.get("/resetallpollkeystozero/:pollcode/", (req, res, next) => {
    let pollcode = req.params["pollcode"].toLowerCase();
    let polldataFile = "./polldata/" + pollcode.toString() + ".json";

    fs.readFile(polldataFile, 'utf8', (err, polldata) => {
        polldata = JSON.parse(polldata);
        for(let key in polldata.content) polldata.content[key] = 0;
        fs.writeFile(polldataFile, JSON.stringify(polldata, null, 2), () =>{
            res.send('OK')
        });
    });
});

// Last non-error handling middleware - 404 When nothing else has responded
app.use((req, res, next) => {
    res.status(404);

    res.format({
        html: () => res.render('404', { url: req.url, title: "Err 404", sitekey: sitekey}),
        json: () => res.json({ error: 'Not found' }),
        default: () => res.type('txt').send('Not found')
    })
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('500', { error: err, title: "Error", sitekey: sitekey});
});

function pollPage(req, res, next, overrideResults = false){
    let pollcode = req.params["pollcode"].toLowerCase();
    let polldataFile = "./polldata/" + pollcode.toString() + ".json";

    fs.readFile(polldataFile, 'utf8', (err, polldata) => {
        if (!err) {
            polldata = JSON.parse(polldata);
            let things = polldata.content;

            let a = Math.floor(Math.random() * Object.keys(things).length);
            let b = a;
            while (b == a) b = Math.floor(Math.random() * Object.keys(things).length);

            let filteredResults = null;
            if(polldata.results || overrideResults){
                filteredResults = Object.entries(things).sort(([, a], [, b]) => b - a);
                let places = filteredResults.length;

                for (let i = polldata.resultPlaces; i < places; i++) {
                    filteredResults.pop();
                }
            }
            
            res.render("pollTemplate", {
                sitekey: sitekey,
                title: "This That: " + polldata.name.toString(),
                pollCode: pollcode,
                pollName: polldata.name,
                totalVotes: polldata.totalVotes,
                active: polldata.active,
                enableResults: polldata.results || overrideResults,
                results: filteredResults,
                btn1: Object.keys(things)[a],
                btn2: Object.keys(things)[b],
                allowSkip: polldata.allowSkip
            });
            
        } else {
            console.log("Poll data file (" + polldataFile.toString() + ") was not found - responding 404");
            next();
        }
    });
}

httpServer.listen(httpPort, ip, () => {
    console.log("Listening for request on HTTP");
});