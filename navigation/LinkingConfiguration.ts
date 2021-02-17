import * as Linking from 'expo-linking';
let screensObject = {};
['Auth', 'Login', 'Signup', 'App', 'Projects', 'Timesheet', 'Calendar', 'Settings'].forEach(obj => screensObject[obj] = obj.toLowerCase());

export default {
  prefixes: [Linking.makeUrl('/')],
  config: {
    screens: screensObject,
  },
};
