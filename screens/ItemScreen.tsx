import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, RefreshControl, ScrollView, TextInput, Platform } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import * as root from '../Root';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';

export default function ItemScreen({ route, navigation, refresh, setLoading }: any) {
    const [item, setItem] = useState({});
    const [refreshControl, setRefreshControl] = useState(false);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        onRefresh();
    }, [refresh, route.params]);

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        let item = await API.graphql(graphqlOperation(`
        {
            kanban_items_by_pk(id: "${route.params.id}") {
              id
              key
              name
              kanban_column {
                name
                kanban_project {
                  name
                  project {
                    key
                  }
                }
              }
              updated_at
              created_at
            }
          }          
          `));
        setItem(item.data.kanban_items_by_pk);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    const saveItem = async () => {
        await API.graphql(graphqlOperation(`mutation {
            update_kanban_items(where: {id: {_eq: "${route.params.id}"}}, _set: {name: "${item.name}"}) {
              affected_rows
            }
          }
        `));
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb && <View style={{ height: 50 }} />}
            <ScrollView
                style={{ maxWidth: 600, width: '100%', height: '100%', padding: 10, overflow: 'visible' }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => onRefresh(true)}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
                keyboardShouldPersistTaps="always"
            >
                <View style={{ flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: 50 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <TouchableOpacity onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                        <Text>{item?.kanban_column ? `${item.kanban_column.kanban_project.project.key}-${item.kanban_column.kanban_project.name}-${item.key}` : ``}</Text>
                        <Text style={{ fontSize: 30, opacity: 0 }}>←</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: root.desktopWeb ? -10 : 0 }}>
                        <Text>{item?.kanban_column ? `created: ${new Date(item.created_at).toLocaleDateString()}, updated: ${new Date(item.updated_at).toLocaleDateString()}` : ``}</Text>
                    </View>
                </View>
                <TextInput spellCheck={false} multiline={true} textAlignVertical={'top'} style={{ backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 16, width: '100%', borderRadius: 10, height: 200 }} value={item.name}
                    inputAccessoryViewID='main'
                    onChangeText={(value) => { setItem({ ...item, name: value }) }}
                />
                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={async () => { await saveItem(); navigation.goBack(); }} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ textAlign: 'center' }}>{route.params.id ? `save` : `add`}</Text></TouchableOpacity>
                </View>
            </ScrollView>
            <InputAccessoryViewComponent />
        </View>
    );
}

const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.6) {
    return isWeb ? number * factor : number;
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: '#ffffff'
    },
    touchableOpacity: {
        backgroundColor: '#3F0054',
        padding: s(10),
        width: 275,
        alignItems: 'center',
        margin: s(10),
        borderRadius: 10
    },
    buttonText: {
        fontSize: s(30)
    },
    textInput: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: '100%', borderRadius: 10 },
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, paddingLeft: 35 }
});
