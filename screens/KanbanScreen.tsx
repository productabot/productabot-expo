import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Image, Platform, TextInput } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import Draggable from 'react-native-draggable';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';

export default function KanbanScreen({ route, navigation }: any) {
    const [state, setState] = useState({
        loading: false,
        cancelContentTouches: true,
        kanban: { kanban_columns: [] },
        columnWidth: 0,
        columnPadding: 0,
        layoutInvalidationKey: new Date().toISOString(),
        doNotUpdate: false
    });

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [])
    );

    let onRefresh = async () => {
        setState({ ...state, loading: true });
        let data = await API.graphql(graphqlOperation(`{
            kanban_projects_by_pk(id: "${route.params.id}") {
                id
              name
              project {
                  key
                  id
              }
              kanban_columns(order_by: {order: asc}) {
                  id
                name
                kanban_items(order_by: {order: asc}) {
                    id
                  name
                  key
                }
              }
            }
          }`));
        setState({ ...state, loading: false, kanban: data.data.kanban_projects_by_pk, columnWidth: root.desktopWeb ? Math.round(750 * 0.3333) : Math.round((root.windowWidth * 3) * 0.3333), columnPadding: root.desktopWeb ? 30 : 50 });
    }

    useEffect(() => {
        updateKanban();
    }, [state.kanban]);

    let updateKanban = async () => {
        if (state.kanban.kanban_columns.length > 0 && !state.doNotUpdate) {
            let response = await API.graphql(graphqlOperation(`mutation {
            ${state.kanban.kanban_columns.map((column, columnIndex) => `column${columnIndex}: update_kanban_columns_by_pk(pk_columns: {id: "${column.id}"}, _set: {order: ${columnIndex}}) {id}
                ${column.kanban_items.map((item, itemIndex) => `column${columnIndex}item${itemIndex}: update_kanban_items_by_pk(pk_columns: {id: "${item.id}"}, _set: {order: ${itemIndex}, name: "${item.name.replace(/[\r\n]/g, "\\n").replace(/"/g, `\\"`)}", kanban_column_id: "${column.id}"}) {id}`)}
            `)}
            }`));
            //console.log(response);
            //     setTimeout(() => {
            //         setState({ ...state, updateInProgress: false })
            //     }, 5000);
        }
        else {
            setState({ ...state, doNotUpdate: false });
        }
    }

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 50, marginBottom: root.desktopWeb ? 0 : -20, zIndex: 10, position: 'relative' }}>
                <TouchableOpacity style={{ marginRight: 10 }} onPress={async () => {
                    navigation.navigate('project', { id: state.kanban.project.id })
                }}><Text>←</Text></TouchableOpacity>
                <Text>{state.kanban.name}</Text>
                <TouchableOpacity style={{ marginLeft: 10 }} onPress={async () => {
                    setState({ ...state, loading: true });
                    await API.graphql(graphqlOperation(`mutation {
                        delete_kanban_projects_by_pk(id: "${state.kanban.id}") {
                          id
                        }
                      }
                      `));

                    setState({ ...state, loading: false });
                    navigation.navigate('project', { id: state.kanban.project.id })
                }}><Text>×</Text></TouchableOpacity>
            </View>
            <DraggableFlatList
                horizontal={true}
                containerStyle={{ width: root.desktopWeb ? 750 : root.windowWidth }}
                data={state.kanban.kanban_columns}
                renderItem={(columnParams) => {
                    return (
                        <View style={{ flexDirection: 'column', width: root.desktopWeb ? (750 / state.kanban.kanban_columns.length) : root.windowWidth, height: root.desktopWeb ? 600 : '100%', padding: root.desktopWeb ? 2 : 20 }}>
                            <TouchableOpacity delayLongPress={0} onLongPress={columnParams.drag} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, cursor: 'grab' }}>
                                <Text>{columnParams.item.name}</Text>
                                <TouchableOpacity delayLongPress={5} onPress={async () => {
                                    console.log("add!!");
                                    let count = await API.graphql(graphqlOperation(`{
                                        kanban_items_aggregate(where: {kanban_column_id: {_in: [${state.kanban.kanban_columns.map(obj => `"${obj.id}"`).join(',')}]}}) {
                                            aggregate {
                                                max {
                                                    key
                                                }
                                            }
                                        }
                                    }`));
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                        insert_kanban_items_one(object: {kanban_column_id: "${columnParams.item.id}", name: "", order: ${columnParams.item.kanban_items.length}, key: ${count.data.kanban_items_aggregate.aggregate.max.key + 1}}) {
                                          id
                                        }
                                      }`));
                                    let newKanbanColumns = state.kanban.kanban_columns;
                                    newKanbanColumns[columnParams.index].kanban_items.push({ id: data.data.insert_kanban_items_one.id, kanban_column_id: columnParams.item.id, name: '', key: count.data.kanban_items_aggregate.aggregate.max.key + 1 });
                                    setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString() })
                                }}>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>+</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                            <DraggableFlatList
                                containerStyle={{ height: '100%', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid' }}
                                data={columnParams.item.kanban_items}
                                renderItem={(itemParams) => {
                                    return (
                                        <View style={{ padding: 5, height: 150 }}>
                                            <View
                                                style={{
                                                    height: 140,
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-start',
                                                    borderColor: '#ffffff',
                                                    borderWidth: 1,
                                                    backgroundColor: '#000000',
                                                    paddingBottom: 1
                                                }}>
                                                <TouchableOpacity delayLongPress={0}
                                                    onLongPress={itemParams.drag} style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ffffff', height: 22, cursor: 'grab' }}>
                                                    {columnParams.index !== 0 ?
                                                        <TouchableOpacity onPress={() => {
                                                            console.log("press!")
                                                            let newKanbanColumns = state.kanban.kanban_columns;
                                                            newKanbanColumns[columnParams.index - 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(itemParams.index, 1)[0]);
                                                            setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString() })
                                                        }}><Text style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{`←`}</Text></TouchableOpacity> :
                                                        <TouchableOpacity onPress={async () => {
                                                            await API.graphql(graphqlOperation(`mutation {delete_kanban_items_by_pk(id: "${itemParams.item.id}") {id}}`));
                                                            let newKanbanColumns = state.kanban.kanban_columns;
                                                            newKanbanColumns[columnParams.index].kanban_items.splice(itemParams.index, 1);
                                                            setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString() })
                                                        }}><Text>×</Text></TouchableOpacity>
                                                    }
                                                    <Text style={{ fontSize: 12, marginRight: 10 }}>{state.kanban.project.key}-{itemParams.item.key}</Text>
                                                    {columnParams.index !== state.kanban.kanban_columns.length - 1 ?
                                                        <TouchableOpacity onPress={() => {
                                                            let newKanbanColumns = state.kanban.kanban_columns;
                                                            newKanbanColumns[columnParams.index + 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(itemParams.index, 1)[0]);
                                                            setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString() })
                                                        }}><Text style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{`→`}</Text></TouchableOpacity> :
                                                        <TouchableOpacity onPress={async () => {
                                                            await API.graphql(graphqlOperation(`mutation {delete_kanban_items_by_pk(id: "${itemParams.item.id}") {id}}`));
                                                            let newKanbanColumns = state.kanban.kanban_columns;
                                                            newKanbanColumns[columnParams.index].kanban_items.splice(itemParams.index, 1);
                                                            setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString() })
                                                        }}><Text>×</Text></TouchableOpacity>
                                                    }
                                                </TouchableOpacity>
                                                <TextInput multiline={true} textAlignVertical={'top'} style={[{ color: '#ffffff', fontSize: 18, width: '100%', padding: 5 }, root.desktopWeb && { outlineWidth: 0, height: '100%' }]} value={itemParams.item.name}
                                                    onChangeText={(value) => {
                                                        let newKanbanColumns = state.kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index].kanban_items[itemParams.index].name = value;
                                                        setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString(), doNotUpdate: true })
                                                    }}
                                                    onBlur={async () => {
                                                        setState({ ...state, kanban: { ...state.kanban }, doNotUpdate: false })
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    )
                                }}
                                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                                activationDistance={10}
                                dragItemOverflow={true}
                                layoutInvalidationKey={state.layoutInvalidationKey}
                                onDragEnd={({ data }) => {
                                    let newKanbanColumns = state.kanban.kanban_columns;
                                    newKanbanColumns[columnParams.index].kanban_items = data;
                                    setState({ ...state, kanban: { ...state.kanban, kanban_columns: newKanbanColumns }, layoutInvalidationKey: new Date().toISOString() })
                                }}
                            />
                        </View>
                    )
                }}
                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                activationDistance={10}
                dragItemOverflow={true}
                layoutInvalidationKey={state.layoutInvalidationKey}
                onDragEnd={({ data }) => {
                    setState({ ...state, kanban: { ...state.kanban, kanban_columns: data }, layoutInvalidationKey: new Date().toISOString() })
                }}
            />
            {state.loading && <LoadingComponent />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center'
    },
});
