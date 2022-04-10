import * as React from 'react';
import { Text } from '../components/Themed';
import { View, RefreshControl, Platform, useWindowDimensions, Image, Alert, TouchableOpacity } from 'react-native';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import { useFocusEffect } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import * as root from '../Root';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import InputComponent from '../components/InputComponent';

const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 2);
export default function TasksScreen({ refresh, setLoading, loading, navigation, givenProjectId = '', projectScreen = false }: any) {
    const [refreshControl, setRefreshControl] = React.useState(false);
    const [index, setIndex] = React.useState(1);
    const [checked, setChecked] = React.useState([]);
    const [count, setCount] = React.useState({ backlog: 0, selected: 0, in_progress: 0, done: 0 });
    const [tasks, setTasks] = React.useState([]);
    const [projects, setProjects] = React.useState([]);
    const [projectId, setProjectId] = React.useState('');
    const windowDimensions = useWindowDimensions();
    const [contextPosition, setContextPosition] = React.useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const menuRef = React.useRef(null);
    const [confetti, setConfetti] = React.useState(false);
    const { colors } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            if (!checked) {
                onRefresh();
            }
        }, [index, projectId, checked])
    );

    React.useEffect(() => {
        onRefresh();
    }, [refresh, index, projectId]);

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        let tasksData = await API.graphql(graphqlOperation(`{
            tasks(order_by: {root_order: desc}, where: {${projectId ? `project_id: {_eq:"${projectId}"},` : givenProjectId ? `project_id: {_eq:"${givenProjectId}"},` : ``}status: {_eq: "${index === 0 ? 'backlog' : index === 1 ? 'selected' : index === 2 ? 'in_progress' : 'done'}"}}) {
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
            }
            backlog: tasks_aggregate(where: {status: {_eq: "backlog"}}) {
                aggregate {
                count
                }
            }
            selected: tasks_aggregate(where: {status: {_eq: "selected"}}) {
                aggregate {
                count
                }
            }
            in_progress: tasks_aggregate(where: {status: {_eq: "in_progress"}}) {
                aggregate {
                count
                }
            }
            done: tasks_aggregate(where: {status: {_eq: "done"}}) {
                aggregate {
                count
                }
            }
            projects(order_by: {name: asc}, where: {archived: {_eq: false}}) {
                id
                name
                image
              }
          }`));
        setTasks(tasksData.data.tasks);
        setCount({ backlog: tasksData.data.backlog.aggregate.count, selected: tasksData.data.selected.aggregate.count, in_progress: tasksData.data.in_progress.aggregate.count, done: tasksData.data.done.aggregate.count })
        setProjects([{ name: 'show all projects', id: '' }, ...tasksData.data.projects]);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }


    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Platform.OS === 'web' ? 50 : 0 }}>
            <View style={{ width: Math.min(950, windowDimensions.width), height: windowDimensions.height - (Platform.OS === 'web' ? 60 : projectScreen ? 300 : 120), paddingLeft: 10, paddingRight: 10 }}>
                <View style={{ width: '100%', height: 40, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, marginBottom: -10, marginTop: projectScreen ? 10 : 5 }}>
                    {(!projectScreen && checked.length === 0) &&
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <InputComponent type="select" value={projectId} options={projects} optionImage={true} setValue={(value) => { setProjectId(value) }} width={'75%'} />
                            <TouchableOpacity
                                style={{ backgroundColor: colors.background, padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                                onPress={async () => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); navigation.push('edit_task', { status: index === 0 ? 'backlog' : index === 1 ? 'selected' : index === 2 ? 'in_progress' : 'done', project_id: projectId ?? null }) }}><Text>{`add task +`}</Text></TouchableOpacity>
                        </View>
                    }
                    {(projectScreen && checked.length === 0) &&
                        <TouchableOpacity
                            style={{ marginLeft: 'auto', padding: 5 }}
                            onPress={async () => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); navigation.push('edit_task', { status: index === 0 ? 'backlog' : index === 1 ? 'selected' : index === 2 ? 'in_progress' : 'done', project_id: projectId ?? null }) }}><Text>{`add task +`}</Text></TouchableOpacity>}
                    {(checked.length > 0 && index !== 0) ? <TouchableOpacity
                        style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10, marginLeft: 5 }}
                        onPress={async () => {
                            Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            await API.graphql(graphqlOperation(`mutation {${checked.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task}"}, _set: {status: "${index === 1 ? 'backlog' : index === 2 ? 'selected' : index === 3 ? 'in_progress' : 'done'}", root_order: 10000}) {id}`)}}`));
                            setChecked([]);
                            await onRefresh();
                        }}><Text style={{ color: '#ffffff' }}>{`move to `}<Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{index === 1 ? 'backlog' : index === 2 ? 'selected' : index === 3 ? 'in progress' : 'done'}</Text></Text></TouchableOpacity> : <Text>{``}</Text>}
                    {checked.length !== 0 &&
                        <View style={{ alignSelf: 'center', backgroundColor: colors.background, padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}><Text>{`${checked.length}${![1, 2].includes(index) ? ' selected' : ''}`}</Text></View>
                    }
                    {(checked.length > 0 && index !== 3) ? <TouchableOpacity
                        style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10, marginRight: 5 }}
                        onPress={async () => {
                            await API.graphql(graphqlOperation(`mutation {${checked.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task}"}, _set: {status: "${index === 0 ? 'selected' : index === 1 ? 'in_progress' : index === 2 ? 'done' : 'backlog'}", root_order: 10000}) {id}`)}}`));
                            setChecked([]);
                            await onRefresh();
                            if (index === 2) {
                                Platform.OS !== 'web' && [...Array(25).keys()].map(i => setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, i * 25));
                                setConfetti(true); setTimeout(() => { setConfetti(false) }, 2500);
                            }
                        }}><Text style={{ color: '#ffffff' }}>{`move to `}<Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{index === 0 ? 'selected' : index === 1 ? 'in progress' : index === 2 ? 'done' : 'backlog'}</Text></Text></TouchableOpacity> : <Text>{``}</Text>}
                </View>
                <SegmentedControl
                    appearance={colors.background === '#000000' ? 'dark' : 'light'}
                    style={{ width: '100%', marginTop: projectScreen ? 5 : 10 }}
                    values={[`backlog`, `selected`, `in progress`, `done`]}
                    selectedIndex={index}
                    onChange={(e) => { setChecked([]); setIndex(e.nativeEvent.selectedSegmentIndex); Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                />
                <CustomDraggableFlatList
                    noBorder={true}
                    data={tasks}
                    renderItem={({ item, index }) =>
                        <>
                            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -5, marginBottom: -5 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '75%' }}>
                                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                                        <Image style={{ height: 30, width: 30, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${item.project.image}` }} />
                                    </View>
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                                        <Text style={{ color: '#aaaaaa', fontSize: 10, textAlign: 'left', marginTop: 5 }}>{new Date(item.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                                        <Text style={{ textDecorationLine: item.status === 'done' ? 'line-through' : 'none', fontSize: Platform.OS === 'web' ? 14 : 14 }}>{item.details}</Text>
                                        <Text style={{ fontSize: 10, color: '#aaaaaa' }}>{item.comments_aggregate.aggregate.count} comment{item.comments_aggregate.aggregate.count !== 1 ? 's' : ''}{item.category ? `, #${item.category}` : ``}</Text>
                                    </View>
                                </View>
                                <View>
                                    {Platform.OS === 'web' ?
                                        <input
                                            checked={checked.filter(obj => obj === item.id).length > 0 ? true : false}
                                            style={{ width: 30, height: 30 }}
                                            onChange={(e) => {
                                                if (e.target.checked === true) {
                                                    setChecked([...checked, item.id]);
                                                }
                                                else {
                                                    setChecked(checked.filter(obj => obj !== item.id));
                                                }
                                                setTasks(tasks);
                                            }}
                                            type="checkbox" />
                                        :
                                        <TouchableOpacity
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (checked.filter(obj => obj === item.id).length === 0) {
                                                    setChecked([...checked, item.id]);
                                                }
                                                else {
                                                    setChecked(checked.filter(obj => obj !== item.id));
                                                }
                                            }}
                                            style={{ width: 30, height: 30, borderRadius: 5, borderWidth: checked.filter(obj => obj === item.id).length > 0 ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 5, backgroundColor: checked.filter(obj => obj === item.id).length > 0 ? '#0075ff' : '#ffffff' }}>
                                            {checked.filter(obj => obj === item.id).length > 0 && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 30 }}>✓</Text>}
                                        </TouchableOpacity>
                                    }
                                </View>
                            </View>
                        </>
                    }
                    onRename={async ({ item }) => {
                        const renameFunction = async (rename) => {
                            setLoading(true);
                            if (rename) {
                                await API.graphql(graphqlOperation(`mutation{update_tasks_by_pk(pk_columns: {id: "${item.id}"}, _set: {details: "${rename}"}) {id}}`));
                            }
                            await onRefresh();
                            setLoading(false);
                        }
                        if (Platform.OS !== 'web') {
                            Alert.prompt('Rename', '', async (text) => {
                                await renameFunction(text);
                            }, 'plain-text', item.details);
                        }
                        else {
                            let rename = prompt('Rename', item.details);
                            await renameFunction(rename);
                        }
                    }}
                    onDelete={async ({ item }) => {
                        const deleteFunction = async () => {
                            setLoading(true);
                            await API.graphql(graphqlOperation(`mutation {delete_tasks_by_pk(id: "${item.id}") {id}}`));
                            await onRefresh();
                            setLoading(false);
                        }
                        if (Platform.OS !== 'web') {
                            Alert.alert('Warning', 'Are you sure you want to delete this task?',
                                [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                        }
                        else if (confirm('Are you sure you want to delete this task?')) { await deleteFunction() }
                    }}
                    setContextPosition={setContextPosition}
                    menuRef={menuRef}
                    onPress={async ({ item, index }) => {
                        Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.push('task', { id: item.id });
                    }}
                    onDragEnd={async ({ data }) => {
                        setTasks(data);
                        await API.graphql(graphqlOperation(`mutation {${data.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {root_order: ${data.length - taskIndex - 1}}) {id}`)}}`));
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshControl}
                            onRefresh={() => { onRefresh(true) }}
                            colors={[colors.text]}
                            tintColor={colors.text}
                            titleColor={colors.text}
                            title=""
                        />}
                    style={{ height: windowDimensions.height - (projectScreen ? 370 : 200) }}
                />
            </View>
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y - 40, left: contextPosition.x } }} />
                <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: colors.background, borderColor: '#444444', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        {contextPosition.rename && <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
                            menuRef.current.close();
                            await contextPosition.rename();
                            await onRefresh();
                        }} ><Text>Rename</Text></TouchableOpacity>}
                        {contextPosition.delete && <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
                            menuRef.current.close();
                            await contextPosition.delete();
                            await onRefresh();
                        }}><Text>Delete</Text></TouchableOpacity>}
                        <TouchableOpacity style={{ backgroundColor: colors.background, padding: 5, paddingLeft: 20, width: '100%' }}
                            onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
                    </View>
                </MenuOptions>
            </Menu>
            {confetti && <ConfettiCannon count={100} origin={{ x: windowDimensions.width / 2, y: -15 }} autoStart={true} fadeOut={true} explosionSpeed={350} fallSpeed={2000} />}
        </View >
    );
}