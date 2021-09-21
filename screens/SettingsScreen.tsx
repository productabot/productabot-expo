import React, { useState } from 'react';
import { Text, View } from '../components/Themed';
import { Auth, API, graphqlOperation, Storage } from "aws-amplify";
import { TouchableOpacity, SafeAreaView, useWindowDimensions, Image, TextInput, StyleSheet, Alert, ScrollView, RefreshControl, Platform, KeyboardAvoidingView } from 'react-native';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as WebBrowser from 'expo-web-browser';
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function SettingsScreen({ navigation }: any) {
    const windowDimensions = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [oldUser, setOldUser] = useState({});
    const [user, setUser] = useState({});
    const [size, setSize] = useState(0);

    React.useEffect(() => {
        reload();
    }, []);

    const reload = async () => {
        setLoading(true);
        let user = await Auth.currentSession();
        let data = await API.graphql(graphqlOperation(`{
            users{id created_at email username image first_name last_name plan phone}
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
        setLoading(false);
    }


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
                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0, format: ImageManipulator.SaveFormat.JPEG });
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
            reload();
        }
        catch (err) {
            Alert.alert('There was an error saving your changes');
            setLoading(false);
            reload();
            console.log(err);
        }
        setLoading(false);

    }

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: '#000000',
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
                        refreshing={loading}
                        onRefresh={() => reload()}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
                    style={{ maxWidth: Math.min(windowDimensions.width, root.desktopWidth), width: root.desktopWeb ? 600 : '100%', padding: 10, height: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
                        <TouchableOpacity onPress={() => { pickImage(); }}>
                            <Image
                                style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1, borderRadius: 10 }}
                                source={{ uri: `https://files.productabot.com/public/${user.image}` }}
                            />
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={{ fontSize: 30 }}>{user.username}</Text>
                            <Text style={{ fontSize: 15 }}>{user.created_at ? `productive since ${new Date(user.created_at).toLocaleDateString()}` : ``}</Text>
                            <Text style={{ fontSize: 15 }}>{`${formatBytes(size)} out of ${user.plan === 'free' ? `100 MB` : `5 TB`} used`}</Text>
                        </View>
                    </View>


                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                        <TouchableOpacity onPress={() => { setUser({ ...user, plan: 'free' }) }} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45%', height: 160, borderRadius: 10, borderColor: '#444444', borderWidth: 1, margin: 20, backgroundColor: user.plan === 'free' ? '#3F0054' : '#000000' }}>
                            <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Free Plan</Text>
                                <Text style={{ fontSize: 20 }}>$0 per month</Text>
                            </View>
                            <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                <Text>• 100 MB storage</Text>
                                <Text>• 5 projects</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setUser({ ...user, plan: 'paid' }) }} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45%', height: 160, borderRadius: 10, borderColor: '#444444', borderWidth: 1, margin: 20, backgroundColor: user.plan === 'paid' ? '#3F0054' : '#000000' }}>
                            <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Paid Plan</Text>
                                <Text style={{ fontSize: 20 }}>$5 per month</Text>
                            </View>
                            <View style={{ flexDirection: 'column', padding: 5, height: '50%' }}>
                                <Text>• 2 TB storage</Text>
                                <Text>• Unlimited projects</Text>
                                <Text>• Website & blog</Text>
                                <Text>• API integrations</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                        <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>website </Text>
                        <Text onPress={async () => {
                            root.desktopWeb ? window.open(`https://${user.username}.pbot.it`) :
                                await WebBrowser.openBrowserAsync(`https://${user.username}.pbot.it`);
                        }} inputAccessoryViewID='main' value={user.username} onChangeText={(value) => { setUser({ ...user, username: value }) }} style={[styles.textInput, { borderWidth: 0, width: '78%', textDecorationLine: 'underline' }]}>
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
                        <TextInput keyboardType='phone-pad' inputAccessoryViewID='main' value={`${user.phone}`} onChangeText={(value) => { setUser({ ...user, phone: value }) }} style={[styles.textInput, { width: '78%' }]} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                        <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>first name</Text>
                        <TextInput inputAccessoryViewID='main' value={user.first_name} onChangeText={(value) => { setUser({ ...user, first_name: value }) }} style={[styles.textInput, { width: '78%' }]} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                        <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>last name</Text>
                        <TextInput inputAccessoryViewID='main' value={user.last_name} onChangeText={(value) => { setUser({ ...user, last_name: value }) }} style={[styles.textInput, { width: '78%' }]} />
                    </View>

                    <TouchableOpacity onPress={saveChanges} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', alignSelf: 'center', marginTop: 10 }}><Text style={{ textAlign: 'center' }}>save changes</Text></TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#000000', alignSelf: 'center', marginTop: 10 }}><Text style={{ textAlign: 'center' }}>log out</Text></TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            {loading && <LoadingComponent />}
            <InputAccessoryViewComponent />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    textInput: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10 }
});
