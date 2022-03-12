import * as Linking from 'expo-linking';

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
                path: 'projects'
              },
              project: {
                path: 'project/:id?'
              },
              document: {
                path: 'document/:id?'
              },
              sheet: {
                path: 'sheet/:id?'
              },
              entry: {
                path: 'projects/entry/:id?'
              },
              task: {
                path: 'projects/task/:id?'
              },
              edit_task: {
                path: 'projects/task/edit/:id?'
              },
            }
          },
          calendarTab: {
            screens: {
              calendar: {
                path: 'calendar',
              },
              entry: {
                path: 'calendar/entry/:id?'
              },
              task: {
                path: 'calendar/task/:id?'
              },
            }
          },
          notesTab: {
            screens: {
              notes: {
                path: 'notes'
              },
              note: {
                path: 'note'
              },
            }
          },
          tasksTab: {
            screens: {
              tasks: {
                path: 'tasks'
              },
              task: {
                path: 'task/:id?'
              },
              edit_task: {
                path: 'task/edit/:id?'
              }
            }
          },
          settingsTab: {
            screens: {
              settings: {
                path: 'settings'
              },
              blank: {
                path: 'blank'
              },
              test: {
                path: 'test'
              },
            }
          }
        },
      },
    },
  },
};
