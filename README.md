# ![logo](https://productabot.com/logo_github.svg?tfsdsssgfdsdss) productabot
### An open-source and minimalist project management tool.
![License](https://img.shields.io/github/license/productabot/productabot-expo?color=blue)
![Dependencies](https://img.shields.io/librariesio/github/productabot/productabot-expo)
[![Docs](https://img.shields.io/badge/docs-gitbook-blue.svg?style=flat)](https://docs.productabot.com)
![Build](https://img.shields.io/badge/build-passing-success)
![Status](https://img.shields.io/website?label=status&url=https%3A%2F%2Fapp.productabot.com)
![Size](https://img.shields.io/badge/minified%20size-0.9mb-blue)

## Our mission
We're creating an open-source and minimalist project management tool.

I tried looking for a better way to manage the time I put into my own projects outside of work. It's hard holding yourself accountable, and the current productivity software offerings aren't well suited for solo users.
- Basecamp is expensive
- Airtable is way too modular
- JIRA is convoluted
- Google Workspace doesn't have a project-management framework 

So, instead of bouncing between Basecamp, JIRA, Airtable, and Google Workspace, I took matters into my own hands and began making a better productivity app.

## Quick overview of our stack
Currently, we're using React Native via Expo on the frontend (which deploys to web, iOS, and Android), and NodeJS, GraphQL, and PostgreSQL served through AWS resources on the backend.

## Get up and running!
We use Expo to develop our app. It creates React Native builds which run on iOS, Android, and the web.

To install the Expo CLI:
```
npm install --global expo-cli
```

After installing the Expo CLI and cloning the repository locally, you can run the following in the project root:
```
yarn install
expo start -w
```

## Want to contribute?
Shoot an email to chris@productabot.com

## License
productabot is licensed under the GNU Affero General Public License v3.0
