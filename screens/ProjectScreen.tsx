import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';

export default function ProjectScreen({ route, navigation }: any) {
    const [state, setState] = useState({
        project: { description: ' ', timesheets: [] },
        loading: false
    });
    useEffect(() => {
        console.log(`componentDidMount`);
        onRefresh();
    }, []);

    let onRefresh = async () => {
        setState({ ...state, loading: true });
        let data = await API.graphql(graphqlOperation(`{
        projects_by_pk(id: "${route.params.id}") {
            id
            name
            image
            description
            timesheets(limit: 10, order_by: {date: desc}) {
              date
              details
              hours
            }
        }
        }`));
        setTimeout(() => {
            setState({ ...state, loading: false, project: data.data.projects_by_pk });
        }, 0);
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>Project</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: 800, width: '100%', height: '100%', padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={state.loading}
                        onRefresh={onRefresh}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                    <Image
                        style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }}
                        source={{ uri: `https://files.productabot.com/${state.project.image}` }}
                    />
                    <View style={{ width: '75%' }}>
                        <Text numberOfLines={1} style={{ fontSize: 40 }}>{state.project.name}</Text>
                        <Text numberOfLines={2} style={{ fontSize: 20 }}>{state.project.description}</Text>
                    </View>
                </View>
                <View style={[{ width: '100%' }, root.desktopWeb && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <Text style={{ fontSize: 20, marginTop: 20, width: '100%' }}>timesheet</Text>
                        {/* <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%', borderWidth: 1, borderColor: '#ffffff' }}>
                            {state.project.timesheets.map((obj, index) =>
                                <View key={index} style={{ flexDirection: 'row', alignContent: 'center', justifyContent: 'space-between', padding: 5, width: '100%' }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{`${new Date(obj.date).toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}</Text>
                                    <Text style={{ fontSize: 14, width: '65%' }}>{`${obj.details}`}</Text>
                                    <Text style={{ fontSize: 14, width: '15%' }}>{`${obj.hours} hours`}</Text>
                                </View>
                            )}
                        </View> */}
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff', overflowY: 'scroll' }}
                            numColumns={1}
                            data={state.project.timesheets}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{`${new Date(item.date).toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}</Text>
                                    <Text style={{ fontSize: 14, width: '60%' }}>{`${item.details}`}</Text>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{`${item.hours} hours`}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item.id}
                            refreshControl={
                                <RefreshControl
                                    refreshing={state.loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                        />
                    </View>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <Text style={{ fontSize: 20, marginTop: 20, width: '100%' }}>documents</Text>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff', overflowY: 'scroll' }}
                            numColumns={1}
                            data={[]}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
                            refreshControl={
                                <RefreshControl
                                    refreshing={state.loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                        />
                    </View>
                </View>
                <View style={[{ width: '100%' }, root.desktopWeb && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <Text style={{ fontSize: 20, marginTop: 20, width: '100%' }}>journal</Text>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff', overflowY: 'scroll' }}
                            numColumns={1}
                            data={[]}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
                            refreshControl={
                                <RefreshControl
                                    refreshing={state.loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                        />
                    </View>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <Text style={{ fontSize: 20, marginTop: 20, width: '100%' }}>kanban</Text>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff', overflowY: 'scroll' }}
                            numColumns={1}
                            data={[]}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
                            refreshControl={
                                <RefreshControl
                                    refreshing={state.loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                        />
                    </View>
                </View>

            </ScrollView>
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
