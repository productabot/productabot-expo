import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { MultipleContainers } from "../components/dndkit/MultipleContainers";

export default function TasksDesktopScreen({ refresh, setLoading, loading, navigation }: any) {
    const [tasks, setTasks] = React.useState({ backlog: [], in_progress: [], done: [] });
    const [projects, setProjects] = React.useState([]);
    const [project, setProject] = React.useState('');
    const [category, setCategory] = React.useState('');

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [refresh, project, category])
    );

    React.useEffect(() => {
        onRefresh();
    }, [refresh, project, category]);

    let onRefresh = async () => {
        setLoading(true);
        let tasksData = await API.graphql(graphqlOperation(`{
            ${['backlog', 'in_progress', 'done'].map(obj => `${obj}: tasks(order_by: {root_order: desc}, where: {status: {_eq: "${obj}"}
            ${project.length > 0 ? `, project_id: {_eq: "${project}"}` : ``}
            ${category.length > 0 ? `, category: {_ilike: "%${category}%"}` : ``}
        }) {
              id
              created_at
              category
              details
              status
              root_order
              project {
                  image
                  color
              }
              comments_aggregate {
                  aggregate {
                    count
                  }
              }
            }`).join(' ')}
            projects(order_by: {name: asc}, where: {archived: {_eq: false}}) {
              id
              name
              image
            }
          }`));
        setTasks({ backlog: tasksData.data.backlog.map(obj2 => JSON.stringify(obj2)), in_progress: tasksData.data.in_progress.map(obj2 => JSON.stringify(obj2)), done: tasksData.data.done.map(obj2 => JSON.stringify(obj2)) });
        setProjects(tasksData.data.projects);
        setLoading(false);
    }

    const saveTasks = async (tasks, task) => {
        if (tasks) {
            //save the order of all tasks
            await API.graphql(graphqlOperation(`mutation {
                ${task.id ? `saveTask: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {status: "${task.status}"}) {id}` : ''}
                ${['backlog', 'in_progress', 'done'].map(
                status => tasks[status].map((task, taskIndex) => `saveTasks${status}${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${JSON.parse(task).id}"}, _set: {root_order: ${tasks[status].length - taskIndex - 1}}) {id}`).join(', ')
            ).join(',')}}`));
        }
    }

    return (
        <div style={{ width: '100%', maxWidth: 1280, paddingTop: 50, marginLeft: 'auto', marginRight: 'auto', height: '80vh' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', color: '#fff', fontFamily: 'arial', marginBottom: 10 }}>
                <select style={{ width: 200, backgroundColor: '#000000', color: '#ffffff', padding: 5, borderRadius: 5, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setProject(e.target.value) }}>
                    <option value="">all projects</option>
                    {projects.map(obj => { return (<option value={obj.id}>{obj.name}</option>) })}
                </select>
                <input placeholder="search by tag" style={{ width: 200, backgroundColor: '#000000', color: '#ffffff', padding: 5, borderRadius: 5, borderStyle: 'solid', borderWidth: 1, height: 17, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setCategory(e.target.value) }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', color: '#ccc', fontFamily: 'arial', marginBottom: 5, fontSize: 14 }}>
                <div>backlog ({tasks.backlog.length}) <span onClick={() => { navigation.navigate('edit_task', { status: 'backlog', project_id: project }) }} style={{ cursor: 'pointer' }}>+</span></div>
                <div>in progress ({tasks.in_progress.length}) <span onClick={() => { navigation.navigate('edit_task', { status: 'in_progress', project_id: project }) }} style={{ cursor: 'pointer' }}>+</span></div>
                <div>done ({tasks.done.length}) <span onClick={() => { navigation.navigate('edit_task', { status: 'done', project_id: project }) }} style={{ cursor: 'pointer' }}>+</span></div>
            </div>
            <MultipleContainers activationConstraint={{ distance: 2 }} scrollable items={tasks} setItems={setTasks} saveTasks={saveTasks} />
        </div>
    );
}