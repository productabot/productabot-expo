import * as Linking from 'expo-linking';

const stringify = { id: (id) => id?.replace(/-/g, ''), state: (state) => '' };

export default {
  prefixes: [Linking.makeUrl('/')],
  config: {
    screens: {
      auth: {
        screens: {
          login: 'login',
          signup: 'signup',
          reset: 'reset',
          terms: 'terms',
          privacy: 'privacy',
        },
      },
      app: {
        screens: {
          projectsTab: {
            screens: {
              projects: {
                path: 'projects',
                stringify
              },
              project: {
                path: 'projects/:id/:state?',
                stringify
              },
              document: {
                path: 'documents/:id?',
                stringify
              },
              sheet: {
                path: 'sheets/:id?',
                stringify
              },
              entry: {
                path: 'projects/entries/:id?',
                stringify
              },
              task: {
                path: 'projects/tasks/:id',
                stringify
              },
              edit_task: {
                path: 'projects/tasks/edit/:id?',
                stringify
              },
              event: {
                path: 'projects/events/:id?',
                stringify
              },
              budget: {
                path: 'projects/budgets/:id?',
                stringify
              },
            }
          },
          calendarTab: {
            screens: {
              calendar: {
                path: 'calendar',
                stringify
              },
              entry: {
                path: 'calendar/entries/:id?',
                stringify
              },
              task: {
                path: 'calendar/tasks/:id?',
                stringify
              },
              event: {
                path: 'calendar/events/:id?',
                stringify
              },
            }
          },
          notesTab: {
            screens: {
              notes: {
                path: 'notes',
                stringify
              },
              note: {
                path: 'note',
                stringify
              },
            }
          },
          tasksTab: {
            screens: {
              tasks: {
                path: 'tasks',
                stringify
              },
              task: {
                path: 'tasks/:id/:state?',
                stringify
              },
              edit_task: {
                path: 'tasks/edit/:id?',
                stringify
              }
            }
          },
          settingsTab: {
            screens: {
              settings: {
                path: 'settings/:state?',
                stringify
              },
              blank: {
                path: 'blank',
                stringify
              },
              test: {
                path: 'test',
                stringify
              },
            }
          }
        },
      },
    },
  },
};
