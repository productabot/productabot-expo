import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, useWindowDimensions, FlatList, ActionSheetIOS } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as Haptics from 'expo-haptics';

let mainDragRefTimeout: any;
let dragRefTimeouts = [null, null, null, null, null, null, null, null];
let touchX: any;
export default function BoardScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [update, setUpdate] = useState(true);
    const [kanban, setKanban] = useState({ kanban_columns: [] });
    const [layoutKey, setLayoutKey] = useState((new Date).toString());
    const mainDragRef = useRef(null);
    const dragRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
    const [lik, setLik] = useState(`${0}`);
    const updateLik = () => {
        setLik(`${lik + 1}`);
    }
    const [index, setIndex] = useState(0);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            kanban_projects_by_pk(id: "${route.params.id}") {
                id
              name
              description
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
        setKanban(data.data.kanban_projects_by_pk);
        setLoading(false);
    }

    useEffect(() => {
        updateKanban();
    }, [kanban]);

    let updateKanban = async () => {
        if (kanban.kanban_columns.length > 0 && update) {
            let response = await API.graphql(graphqlOperation(`mutation {
            ${kanban.kanban_columns.map((column, columnIndex) => `column${columnIndex}: update_kanban_columns_by_pk(pk_columns: {id: "${column.id}"}, _set: {order: ${columnIndex}}) {id}
                ${column.kanban_items.map((item, itemIndex) => `column${columnIndex}item${itemIndex}: update_kanban_items_by_pk(pk_columns: {id: "${item.id}"}, _set: {order: ${itemIndex}, name: "${item.name.replace(/[\r\n]/g, "\\n").replace(/"/g, `\\"`)}", kanban_column_id: "${column.id}"}) {id}`)}
            `)}
            }`));
        }
        else {
            setUpdate(true);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { width: '100%', height: '100%' }]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 50, marginBottom: root.desktopWeb ? 0 : -20, zIndex: 10, position: 'relative', width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : '100%', paddingLeft: 30, paddingRight: 30 }}>
                <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ marginRight: 10 }} onPress={async () => {
                    navigation.navigate('project', { id: kanban.project.id })
                }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                <View style={{ flexDirection: 'column', alignItems: 'center', width: '80%' }}>
                    <TextInput spellCheck={false}
                        value={kanban.name}
                        onChangeText={(value) => {
                            setUpdate(false);
                            setKanban({ ...kanban, name: value });
                        }}
                        onBlur={async () => {
                            await API.graphql(graphqlOperation(`mutation {update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {name: "${kanban.name}"}) {id}}`));
                        }}
                        style={[{ color: '#ffffff', textAlign: 'center', width: '100%', fontWeight: 'bold' }, root.desktopWeb && { outlineWidth: 0 }]}
                    />
                    <TextInput spellCheck={false}
                        multiline={true}
                        value={kanban.description}
                        onChangeText={(value) => {
                            setUpdate(false);
                            setKanban({ ...kanban, description: value });
                        }}
                        onBlur={async () => {
                            await API.graphql(graphqlOperation(`mutation {update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {description: "${kanban.description}"}) {id}}`));
                        }}
                        style={[{ color: '#ffffff', textAlign: 'center', width: '100%' }, root.desktopWeb && { outlineWidth: 0 }]}
                    />
                </View>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 10, fontSize: 30 }} onPress={async () => {
                    async function deleteItem() {
                        setLoading(true);
                        await API.graphql(graphqlOperation(`mutation {
                            delete_kanban_projects_by_pk(id: "${kanban.id}") {
                            id
                            }
                        }
                        `));
                        setLoading(false);
                        navigation.navigate('project', { id: kanban.project.id })
                    }
                    if (Platform.OS === 'ios') {
                        ActionSheetIOS.showActionSheetWithOptions(
                            {
                                options: ['Cancel', 'Delete'],
                                cancelButtonIndex: 0,
                                destructiveButtonIndex: 1
                            },
                            buttonIndex => {
                                if (buttonIndex !== 0) {
                                    deleteItem();
                                }
                            }
                        )
                    }
                    else {
                        if (confirm('Are you sure you want to delete this board?')) { deleteItem(); }
                    }
                }}><Text>...</Text></TouchableOpacity>
            </View>
            <FlatList
                scrollEnabled={false}
                onTouchStart={e => { touchX = e.nativeEvent.pageX }}
                onTouchMove={e => {
                    if (touchX) {
                        if (touchX - e.nativeEvent.pageX > 10 && index < 2) {
                            mainDragRef.current.scrollToIndex({ index: index + 1 }); setIndex(index + 1);
                        }
                        else if (touchX - e.nativeEvent.pageX < -5 && index > 0) {
                            mainDragRef.current.scrollToIndex({ index: index - 1 }); setIndex(index - 1);
                        }
                    }
                }}
                ref={mainDragRef}
                autoscrollSpeed={200}
                layoutInvalidationKey={lik}
                pagingEnabled={true}
                horizontal={true}
                containerStyle={[{ width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : window.width - 10, paddingTop: root.desktopWeb ? 0 : 10 }]}
                data={kanban.kanban_columns}
                renderItem={(columnParams) => {
                    return (
                        <View style={{ flexDirection: 'column', width: root.desktopWeb ? (Math.min(window.width, root.desktopWidth) / kanban.kanban_columns.length) : window.width - 10, height: root.desktopWeb ? window.height - 86 : '100%', padding: root.desktopWeb ? 2 : 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, paddingBottom: 0 }}>
                                <TouchableOpacity delayLongPress={200} onLongPress={columnParams.drag} style={{ cursor: 'grab' }} onPressIn={() => { if (Platform.OS === 'web') { updateLik(); mainDragRef.current.flushQueue(); clearTimeout(mainDragRefTimeout); } }}
                                    onPressOut={() => { if (Platform.OS === 'web') { mainDragRef.current.flushQueue(); clearTimeout(mainDragRefTimeout); mainDragRefTimeout = setTimeout(() => { mainDragRef.current.resetHoverState(); }, 750); } }}
                                    disabled={columnParams.isActive} >
                                    <Text>{columnParams.item.name}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} onPress={async () => {
                                    let count = await API.graphql(graphqlOperation(`{
                                        kanban_items_aggregate(where: {kanban_column_id: {_in: [${kanban.kanban_columns.map(obj => `"${obj.id}"`).join(',')}]}}) {
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
                                    let newKanbanColumns = kanban.kanban_columns;
                                    newKanbanColumns[columnParams.index].kanban_items.push({ id: data.data.insert_kanban_items_one.id, kanban_column_id: columnParams.item.id, name: '', key: count.data.kanban_items_aggregate.aggregate.max.key + 1 });
                                    setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                }}>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <DraggableFlatList
                                onScroll={e => { touchX = false }}
                                scrollEnabled={true}
                                layoutInvalidationKey={lik}
                                containerStyle={{ height: '100%', borderWidth: 1, borderColor: '#000000', borderStyle: 'solid' }}
                                data={columnParams.item.kanban_items}
                                ref={dragRefs[columnParams.index]}
                                renderItem={(item) => {
                                    return (
                                        <TouchableOpacity
                                            onPressIn={() => { if (Platform.OS === 'web') { updateLik(); dragRefs[columnParams.index].current && dragRefs[columnParams.index].current.flushQueue(); clearTimeout(dragRefTimeouts[columnParams.index]); } }}
                                            onPressOut={() => { if (Platform.OS === 'web') { dragRefs[columnParams.index].current && dragRefs[columnParams.index].current.flushQueue(); clearTimeout(dragRefTimeouts[columnParams.index]); dragRefTimeouts[columnParams.index] = setTimeout(() => { dragRefs[columnParams.index].current && dragRefs[columnParams.index].current.resetHoverState(); }, 750); } }}
                                            disabled={item.isActive}
                                            delayLongPress={100}
                                            onLongPress={item.drag}
                                            style={{
                                                margin: 5,
                                                height: 100,
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                borderColor: '#444444',
                                                borderWidth: 1,
                                                backgroundColor: item.isActive ? '#333333' : '#161616',
                                                paddingBottom: 1,
                                                borderRadius: 10,
                                                cursor: 'grab',
                                            }}>
                                            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', height: 22, paddingLeft: 5, paddingRight: 5 }}>
                                                {columnParams.index !== 0 ?
                                                    <TouchableOpacity hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} onPress={() => {
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index - 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1)[0]);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }}><Text style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{`←`}</Text></TouchableOpacity> :
                                                    <TouchableOpacity hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} onPress={async () => {
                                                        await API.graphql(graphqlOperation(`mutation {delete_kanban_items_by_pk(id: "${item.item.id}") {id}}`));
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }}><Text>×</Text></TouchableOpacity>
                                                }
                                                <Text style={{ fontSize: 10, marginRight: 10 }}>{kanban.project.key}-{kanban.name}-{item.item.key}</Text>
                                                {columnParams.index !== kanban.kanban_columns.length - 1 ?
                                                    <TouchableOpacity hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} onPress={() => {
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index + 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1)[0]);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }}><Text style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{`→`}</Text></TouchableOpacity> :
                                                    <TouchableOpacity hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} onPress={async () => {
                                                        await API.graphql(graphqlOperation(`mutation {delete_kanban_items_by_pk(id: "${item.item.id}") {id}}`));
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }}><Text>×</Text></TouchableOpacity>
                                                }
                                            </View>
                                            <TextInput spellCheck={false} multiline={true} textAlignVertical={'top'} style={[{ color: '#ffffff', fontSize: 18, width: '100%', padding: 5, height: 75 }, root.desktopWeb && { outlineWidth: 0, height: '100%', fontSize: 12, cursor: 'grab' }]} value={item.item.name}
                                                inputAccessoryViewID='main'
                                                onChangeText={(value) => {
                                                    let newKanbanColumns = kanban.kanban_columns;
                                                    newKanbanColumns[columnParams.index].kanban_items[item.index].name = value;
                                                    setUpdate(false);
                                                    setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                }}
                                                onBlur={async () => {
                                                    setUpdate(true);
                                                    setKanban({ ...kanban });
                                                }}
                                            />
                                        </TouchableOpacity>
                                    )
                                }}
                                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                                activationDistance={0}
                                dragItemOverflow={true}
                                onDragBegin={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
                                onTouchEnd={(e) => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                onDragEnd={({ data }) => {
                                    let newKanbanColumns = kanban.kanban_columns;
                                    newKanbanColumns[columnParams.index].kanban_items = data;
                                    setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                    setLayoutKey(new Date().toString());
                                }}
                            />
                        </View>
                    )
                }}
                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                activationDistance={0}
                dragItemOverflow={true}
                onDragBegin={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
                onDragEnd={({ data }) => {
                    Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setKanban({ ...kanban, kanban_columns: data });
                    setLayoutKey(new Date().toString());
                }}
            />
            {loading && <LoadingComponent />}
            <InputAccessoryViewComponent />
        </KeyboardAvoidingView >
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
