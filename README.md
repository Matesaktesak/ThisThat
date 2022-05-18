# ThisThat
ThisThat is simple and lightweight website for running polls.
The poll works kind of like a somewhat random sorting algorithm - two (semi)random items are selected from a supplied list and presented to the user. The user is than supposed to pick which ever they prefer and so cast a vote.
Every time a valid vote is cast, the program takes away half a point from the item which wasn't clicked and adds a point to the selected one. Through many votes (idealy thousands) a leader board forms and the users can than be presented with it.

The server has allways been deployed using [PM2 (a process manager)](https://pm2.keymetrics.io/) behind the [Apache](https://httpd.apache.org/) webserver. This configuration is strongly recomended.

## Background
This project was created mostly over night leading up to the 2021 chrismas time. Its sole purpose was to find who the most popular teacher at [GJB](https://gymberoun.cz) is. During the one weekend runtime, over 18.000 votes were cast, topping at over 700 request a minute just after launch. The TOP3 were given gifts. This fun project turned out to be a success with students discusing the poll for months.

Some time later, I was talking to a friend leaning about NodeJS and I offerd the source-code of this project - and so this is it.

**This project is not maintained and is only published for learning purposes!** Only use this at your own risk. Any commits maight be merged - ooooor ignored for years...

## Configuration
### reCAPTCHA
[reCAPTCHA](https://www.google.com/recaptcha/about/) is Googles CAPTCHA service, which is free up to 1megarequest per month (as of writing). We use captcha to reduce spam in the poll.
To use it, you have to go to the link above and in the Administrator console **get a secret and a site key**. Paste those keys into files named `recaptcha_secretkey` and `recaptcha_sitekey` respectivly in the `certs` folder.

#TODO: substitute this system for .ENV... 

### Poll config
Every poll is created as a .json file in the *polldata* folder. **The name of the file is synonymus with the pollcode**.

The required filds are:
- **name** (string) - The display name of the poll
- **active** (bool) - Is the user allowed to cast new votes?
- **results** (bool) - Are the results being desplayed beneath the voting buttons in real time?
- **resultPlaces** (int) - How many places to display in the leaderboard (you sometimes want just the TOP10)
- **allowSkip** (bool) - Is the user allowed to easily skip to the next pair without taping on anything?
- **totalVotes** (int) - Just status... **set to 0 at setup and than leave alone**

- **content** (object) - The poll items in form `"key"` (string)`: value` (int) pair.

#### Example of a new poll config:
```json
{
  "name": "Animals",
  "allowSkip": true,
  "content": {
    "Dog": 0,
    "Cat": 0,
    "Giraffe": 0,
    "Elephant": 0,
    "Guineapig": 0,
    "Pig": 0,
    "Hamster": 0,
    "Sea Horse": 0
  },
  "results": true,
  "active": true,
  "totalVotes": 0,
  "resultPlaces": 5
}
```
