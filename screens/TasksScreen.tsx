import * as React from 'react';
import { Text } from '../components/Themed';
import { View, RefreshControl, Platform, useWindowDimensions, Image, Alert, TouchableOpacity } from 'react-native';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import { useFocusEffect } from '@react-navigation/native';
import { API, graphqlOperation } from 'aws-amplify';
import * as root from '../Root';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import SegmentedControl from '@react-native-segmented-control/segmented-control';

export default function TasksScreen({ refresh, setLoading }: any) {
    const [refreshControl, setRefreshControl] = React.useState(false);
    const [index, setIndex] = React.useState(1);
    const [checked, setChecked] = React.useState([]);
    const [count, setCount] = React.useState({ backlog: 0, in_progress: 0, done: 0 });
    const [tasks, setTasks] = React.useState([]);
    const windowDimensions = useWindowDimensions();
    const [contextPosition, setContextPosition] = React.useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const menuRef = React.useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [index])
    );

    React.useEffect(() => {
        onRefresh();
    }, [refresh, index]);

    let onRefresh = async (showRefreshControl = false) => {
        setChecked([]);
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        let tasksData = await API.graphql(graphqlOperation(`{
            tasks(order_by: {root_order: asc}, where: {status: {_eq: "${index === 0 ? 'backlog' : index === 1 ? 'in_progress' : 'done'}"}}) {
              id
              created_at
              checked
              details
              status
              project {
                  image
                  color
              }
            }
            backlog: tasks_aggregate(where: {status: {_eq: "backlog"}}) {
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
          }`));
        setTasks(tasksData.data.tasks);
        setCount({ backlog: tasksData.data.backlog.aggregate.count, in_progress: tasksData.data.in_progress.aggregate.count, done: tasksData.data.done.aggregate.count })
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }


    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Platform.OS === 'web' ? 50 : 0, }}>
            <View style={{ width: Math.min(600, windowDimensions.width), height: windowDimensions.height - (Platform.OS === 'web' ? 60 : 150) }}>
                <SegmentedControl
                    appearance='dark'
                    style={{ width: '100%', marginTop: 10, marginBottom: 10 }}
                    values={[`backlog (${count.backlog})`, `in progress (${count.in_progress})`, `done (${count.done})`]}
                    selectedIndex={index}
                    onChange={(e) => { setChecked([]); setIndex(e.nativeEvent.selectedSegmentIndex) }}
                />
                <View style={{ width: '100%', height: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
                    {(checked.length > 0 && index !== 0) ? <TouchableOpacity
                        style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                        onPress={async () => {
                            await API.graphql(graphqlOperation(`mutation {${checked.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task}"}, _set: {status: "${index === 1 ? 'backlog' : index === 2 ? 'in_progress' : 'done'}"}) {id}`)}}`));
                            await onRefresh();
                        }}><Text>{`move to `}<Text style={{ fontWeight: 'bold' }}>{index === 1 ? 'backlog' : index === 2 ? 'in progress' : 'done'}</Text></Text></TouchableOpacity> : <Text>{``}</Text>}
                    {checked.length !== 0 &&
                        <View style={{ alignSelf: 'center', backgroundColor: '#000000', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}><Text>{`${checked.length} selected`}</Text></View>
                    }
                    {(checked.length > 0 && index !== 2) ? <TouchableOpacity
                        style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                        onPress={async () => {
                            await API.graphql(graphqlOperation(`mutation {${checked.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task}"}, _set: {status: "${index === 0 ? 'in_progress' : index === 1 ? 'done' : 'backlog'}"}) {id}`)}}`));
                            await onRefresh();
                        }}><Text>{`move to `}<Text style={{ fontWeight: 'bold' }}>{index === 0 ? 'in progress' : index === 1 ? 'done' : 'backlog'}</Text></Text></TouchableOpacity> : <Text>{``}</Text>}
                    {checked.length === 0 &&
                        <TouchableOpacity
                            style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                            onPress={async () => { }}><Text>{`add task +`}</Text></TouchableOpacity>
                    }
                </View>
                <CustomDraggableFlatList
                    noBorder={true}
                    data={tasks}
                    renderItem={({ item, index }) =>
                        <>
                            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '75%' }}>
                                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                                        <Image style={{ height: 30, width: 30, borderRadius: 5, borderColor: '#ffffff', borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${item.project.image}` }} />
                                    </View>
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                                        <Text style={{ color: '#aaaaaa', fontSize: 10, textAlign: 'left' }}>{new Date(item.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                                        <Text style={{ textDecorationLine: item.status === 'done' ? 'line-through' : 'none', fontSize: Platform.OS === 'web' ? 14 : 14 }}>{item.details}</Text>
                                    </View>
                                </View>
                                <View onStartShouldSetResponder={() => true}>
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
                                            }}
                                            type="checkbox" />
                                        :
                                        <TouchableOpacity
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            onPress={() => {
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
                    onRename={async (item) => {
                        const renameFunction = async (rename) => {
                            setLoading(true);
                            if (rename) {
                                await API.graphql(graphqlOperation(`mutation{update_tasks_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {details: "${rename}"}) {id}}`));
                            }
                            await onRefresh();
                            setLoading(false);
                        }
                        if (Platform.OS !== 'web') {
                            Alert.prompt('Rename', '', async (text) => {
                                await renameFunction(text);
                            }, 'plain-text', item.item.details);
                        }
                        else {
                            let rename = prompt('Rename', item.item.details);
                            await renameFunction(rename);
                        }
                    }}
                    onDelete={async (item) => {
                        const deleteFunction = async () => {
                            setLoading(true);
                            await API.graphql(graphqlOperation(`mutation {delete_tasks_by_pk(id: "${item.item.id}") {id}}`));
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
                        // setLoading(true);
                        // await API.graphql(graphqlOperation(`mutation{update_tasks_by_pk(pk_columns: {id: "${item.id}"}, _set: {checked: ${item.checked ? 'false' : 'true'}}) {id}}`));
                        // await onRefresh();
                        // setLoading(false);
                        // let innerTasks = tasks;innerTasks[index].checked = !innerTasks[index].checked;setTasks(innerTasks);
                    }}
                    onDragEnd={async ({ data }) => {
                        setTasks(data);
                        await API.graphql(graphqlOperation(`mutation {${data.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {root_order: ${taskIndex}}) {id}`)}}`));
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshControl}
                            onRefresh={() => { onRefresh(true) }}
                            colors={["#ffffff"]}
                            tintColor='#ffffff'
                            titleColor="#ffffff"
                            title=""
                        />}
                />
            </View>
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y - 40, left: contextPosition.x } }} />
                <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: '#000000', borderColor: '#444444', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
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
                        <TouchableOpacity style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 20, width: '100%' }}
                            onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
                    </View>
                </MenuOptions>
            </Menu>
        </View>
    );
}