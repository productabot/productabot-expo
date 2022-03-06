import React, { useState } from 'react';
import { Text, View } from '../components/Themed';
import { Storage } from "@aws-amplify/storage";
import { Auth } from "@aws-amplify/auth";
import { API, graphqlOperation } from "@aws-amplify/api";
import { TouchableOpacity, useWindowDimensions, Image, TextInput, StyleSheet, Alert, ScrollView, RefreshControl, Platform, KeyboardAvoidingView, FlatList } from 'react-native';
import * as root from '../Root';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as WebBrowser from 'expo-web-browser';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function SettingsScreen({ navigation, refresh, setLoading }: any) {
    const windowDimensions = useWindowDimensions();
    const [refreshControl, setRefreshControl] = useState(false);
    const [oldUser, setOldUser] = useState({});
    const [user, setUser] = useState({});
    const [size, setSize] = useState(0);
    const [index, setIndex] = useState(0);
    const [github, setGithub] = useState([]);

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [refresh])
    );

    const onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        let user = await Auth.currentSession();
        let data = await API.graphql(graphqlOperation(`{
            users{id created_at email username image first_name last_name plan phone github}
            files_aggregate(where: {user_id: {_eq: "${user.getIdToken().payload.sub}"}}) {
                aggregate {
                  sum {
                    size
                  }
                }
              }
        }`));
        console.log(data);
        setOldUser(data.data.users[0]);
        setUser(data.data.users[0]);
        setSize(data.data.files_aggregate.aggregate.sum.size);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    React.useEffect(() => {
        const async = async () => {
            if (index === 2 && user.github && github.length === 0) {
                try {
                    setLoading(true);
                    let data = await API.get('1', '/auth/github', {});
                    console.log(data);
                    setGithub(data);
                    setLoading(false);
                }
                catch (err) {
                    setLoading(false);
                    console.log(err);
                }
            }
        }
        async();
    }, [index])


    const pickImage = async () => {
        try {
            let selectedMedia = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
            });
            if (!selectedMedia.cancelled) {
                setLoading(true);
                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
                let response = await fetch(media.uri);
                let blob = await response.blob();
                let filename = `${uuidv4()}.jpg`;
                await Storage.put(filename, blob, { contentType: 'image/jpeg', level: 'public' });
                try { user.image && await Storage.remove(user.image); }
                catch (err) { console.log(err); }
                setUser({ ...user, image: filename });
                await API.graphql(graphqlOperation(`
                mutation {
                    update_users_by_pk(pk_columns: {id: "${user.id}"}, _set: {image: "${filename}"}) {
                        id
                    }
                }`));
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            console.log(err);
        }
    };

    const logout = async () => {
        setLoading(true);
        await Auth.signOut();
        setLoading(false);
        navigation.navigate('auth');
        Platform.OS === 'web' && setTimeout(() => { window.location.reload() }, 250);
    }

    const cancelChanges = async () => {
        setUser(oldUser);
    }

    const saveChanges = async () => {
        setLoading(true);
        if (user.plan === 'paid' && oldUser.plan === 'free') {
            await WebBrowser.openBrowserAsync('https://buy.stripe.com/test_eVa4hW8aC7AuaeQ8ww');
            //now, check if the payment went through
            //if it didn't, don't update plan!!
        }
        try {
            await API.graphql(graphqlOperation(`
            mutation {
                update_users_by_pk(pk_columns: {id: "${user.id}"}, _set: {username: "${user.username}", email: "${user.email}", first_name: "${user.first_name}", last_name: "${user.last_name}", plan: "${user.plan}", phone: "${user.phone}"}) {
                    id
                }
            }`));
            setLoading(false);
            onRefresh();
        }
        catch (err) {
            Alert.alert('There was an error saving your changes');
            setLoading(false);
            onRefresh();
            console.log(err);
        }
        setLoading(false);

    }

    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: root.desktopWeb ? 50 : 0
        }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ height: '100%' }}
            >
                <ScrollView
                    refreshControl={<RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => onRefresh(true)}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
                    style={{ width: root.desktopWeb ? Math.min(910, windowDimensions.width - 40) : windowDimensions.width, padding: root.desktopWeb ? 0 : 10, height: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
                        <TouchableOpacity onPress={() => { pickImage(); }}>
                            <Image
                                style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1, borderRadius: 10 }}
                                source={{ uri: `https://files.productabot.com/public/${user.image}` }}
                            />
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={{ fontSize: 30 }}>{oldUser.username}</Text>
                            <Text style={{ fontSize: 15 }}>{user.created_at ? `productive since ${new Date(user.created_at).toLocaleDateString()}` : ``}</Text>
                            <Text style={{ fontSize: 15 }}>{`${formatBytes(size)} out of ${oldUser.plan === 'free' ? `100 MB` : `100 GB`} used`}</Text>
                        </View>
                        <View style={{ alignSelf: 'flex-start', marginLeft: 'auto', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 }}>
                            <TouchableOpacity onPress={logout}><Text style={{ textAlign: 'center' }}>log out →</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { }}><Text style={{ textAlign: 'center' }}>{root.desktopWeb ? `need help? talk to us` : `help`}</Text></TouchableOpacity>
                        </View>

                    </View>

                    <SegmentedControl
                        appearance='dark'
                        style={{ marginTop: 10 }}
                        values={[`account`, `cards/invoices`, `integrations`]}
                        selectedIndex={index}
                        onChange={(e) => { setIndex(e.nativeEvent.selectedSegmentIndex); Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    />
                    <View style={{ flexDirection: 'column', width: '100%' }}>
                        {index == 0 &&
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <TouchableOpacity onPress={() => { setUser({ ...user, plan: 'free' }) }} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45%', height: 160, borderRadius: 10, borderColor: '#444444', borderWidth: 1, margin: 20, backgroundColor: user.plan === 'free' ? '#3F0054' : '#000000' }}>
                                        <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>free</Text>
                                            <Text style={{ fontSize: 20 }}>$0.00 per month</Text>
                                        </View>
                                        <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                            <Text>• 100 MB storage</Text>
                                            <Text>• 4 projects</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setUser({ ...user, plan: 'paid' }) }} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45%', height: 160, borderRadius: 10, borderColor: '#444444', borderWidth: 1, margin: 20, backgroundColor: user.plan === 'paid' ? '#3F0054' : '#000000' }}>
                                        <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>✦ premium</Text>
                                            <Text style={{ fontSize: 20 }}>$1.99 per month</Text>
                                        </View>
                                        <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                            <Text>• 100 GB storage</Text>
                                            <Text>• unlimited projects</Text>
                                            <Text>• website & blog</Text>
                                            <Text>• api integrations</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>website </Text>
                                    <Text onPress={async () => {
                                        root.desktopWeb ? window.open(`https://${user.username}.pbot.it`) :
                                            await WebBrowser.openBrowserAsync(`https://${user.username}.pbot.it`);
                                    }} style={[styles.textInput, { borderWidth: 0, width: '78%', textDecorationLine: 'underline' }]}>
                                        {user.username ? `${user.username}.productabot.com →\n${user.username}.pbot.it →` : ``}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>username</Text>
                                    <TextInput inputAccessoryViewID='main' value={user.username} onChangeText={(value) => { setUser({ ...user, username: value }) }} style={[styles.textInput, { width: '78%' }]} />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>email</Text>
                                    <TextInput inputAccessoryViewID='main' value={user.email} onChangeText={(value) => { setUser({ ...user, email: value }) }} style={[styles.textInput, { width: '78%' }]} />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>phone</Text>
                                    <TextInput keyboardType='phone-pad' inputAccessoryViewID='main' value={`${user.phone ? user.phone : ''}`} onChangeText={(value) => { setUser({ ...user, phone: value }) }} style={[styles.textInput, { width: '78%' }]} />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>first name</Text>
                                    <TextInput inputAccessoryViewID='main' value={user.first_name} onChangeText={(value) => { setUser({ ...user, first_name: value }) }} style={[styles.textInput, { width: '78%' }]} />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>last name</Text>
                                    <TextInput inputAccessoryViewID='main' value={user.last_name} onChangeText={(value) => { setUser({ ...user, last_name: value }) }} style={[styles.textInput, { width: '78%' }]} />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                                    <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>password</Text>
                                    <Text onPress={async () => { }} style={[styles.textInput, { borderWidth: 0, width: '78%', textDecorationLine: 'underline' }]}>
                                        {`change password →`}
                                    </Text>
                                </View>
                                {(!user.username || user !== oldUser) &&
                                    <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={cancelChanges} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                                        <TouchableOpacity onPress={saveChanges} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ textAlign: 'center' }}>save changes</Text></TouchableOpacity>
                                    </View>}
                            </>}
                        {index == 1 &&
                            <View style={{ padding: 10 }}>
                                <Text style={{ width: '100%', marginBottom: 5 }}>cards</Text>
                                <FlatList style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#444444', borderRadius: 10, marginBottom: 20 }} data={[]} renderItem={(item) => <View></View>} />
                                <Text style={{ width: '100%', marginBottom: 5 }}>invoices</Text>
                                <FlatList style={{ width: '100%', height: 300, borderWidth: 1, borderColor: '#444444', borderRadius: 10, marginBottom: 5 }} data={[]} renderItem={(item) => <View></View>} />
                            </View>}
                        {index == 2 &&
                            <View style={{ padding: 10 }}>
                                {user.github ?
                                    <>
                                        <TouchableOpacity onPress={async () => {
                                            Alert.alert('Warning', `Are you sure you want to disconnect GitHub?`,
                                                [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: () => console.log("yes") }])
                                        }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 140, borderRadius: 10, borderColor: '#444444', borderWidth: 1, backgroundColor: '#000000', marginBottom: 10 }}>
                                            <Image style={{ height: 80, width: 80 }} source={require('../assets/images/github.png')} />
                                            <View style={{ flexDirection: 'column', width: '70%', alignItems: 'flex-start' }}>
                                                <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>disconnect from github</Text>
                                                </View>
                                                <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                                    <Text>• unlink repositories</Text>
                                                    <Text>• stop automating time entries with new commits</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                        {/* <Text>{JSON.stringify(github)}</Text> */}
                                        <FlatList style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#444444', borderRadius: 10, marginBottom: 20 }} data={github} renderItem={(item) => <Text style={{ color: '#ffffff', padding: 10 }}>{item.item}</Text>} />
                                    </>
                                    :
                                    <TouchableOpacity onPress={async () => {
                                        let user = await Auth.currentSession();
                                        await WebBrowser.openBrowserAsync(`https://github.com/login/oauth/authorize?client_id=ddf157abfeef6dade7b6&scope=repo&redirect_uri=https://lambda.productabot.com/github_callback?sub=${user.getIdToken().payload.sub}`);
                                    }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 140, borderRadius: 10, borderColor: '#444444', borderWidth: 1, backgroundColor: '#000000', marginBottom: 10 }}>
                                        <Image style={{ height: 80, width: 80 }} source={require('../assets/images/github.png')} />
                                        <View style={{ flexDirection: 'column', width: '70%', alignItems: 'flex-start' }}>
                                            <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>connect to github</Text>
                                            </View>
                                            <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                                <Text>• link repositories</Text>
                                                <Text>• automate time entries with new commits</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                }
                                {/* <TouchableOpacity onPress={() => { setUser({ ...user, plan: 'paid' }) }} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 160, borderRadius: 10, borderColor: '#444444', borderWidth: 1, backgroundColor: '#000000' }}>
                                    <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>connect with google</Text>
                                    </View>
                                    <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                        <Text>• sync files to google drive</Text>
                                        <Text>• sync entries to google calendar</Text>
                                        <Text>• sync docs to google docs</Text>
                                    </View>
                                </TouchableOpacity> */}
                            </View>}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent />
        </View>
    );
}

const styles = StyleSheet.create({
    textInput: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10 }
});
