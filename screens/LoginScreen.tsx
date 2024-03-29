import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Auth } from "@aws-amplify/auth";
import LogoSvg from "../svgs/logo"
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { useApolloClient } from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { useTheme } from '@react-navigation/native';

export default function LoginScreen({ route, navigation, setLoading, loading, setTheme, theme }: any) {
    const client = useApolloClient();
    const [state, setState] = useState({ email: '', password: '', errorMessage: '', successMessage: '', success: false });
    const { colors } = useTheme();
    const styles = makeStyles(colors);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        if (route.params.success) { setState({ ...state, successMessage: 'Success! Confirm your email before logging in' }); }
        if (route.params.reset) { setState({ ...state, successMessage: 'We sent you a link to reset your password' }); }
        if (route.params.email) { setState({ ...state, email: route.params.email, successMessage: 'Email successfully confirmed! You may log in' }); }
        if (route.params.demo) {
            setLoading(true);
            Auth.signIn({
                username: 'demo@productabot.com',
                password: 'password'
            }).then(() => {
                //if the login attempt succeeds, store the password
                AsyncStorage.setItem('e2e', 'password').then(() => {
                    connectWebsocket();
                    setState({ ...state, errorMessage: '', successMessage: '', email: '', password: '' });
                    setLoading(false);
                    navigation.reset({ index: 0, routes: [{ name: 'app' }] });
                });
            });
        }
    }, [route.params]);

    const login = async () => {
        Keyboard.dismiss();
        setLoading(true);
        try {
            await Auth.signIn({
                username: state.email,
                password: state.password
            });
            await AsyncStorage.setItem('e2e', state.password);
            connectWebsocket();
            setLoading(false);
            setState({ ...state, errorMessage: '', successMessage: '', email: '', password: '' });
            navigation.reset({ index: 0, routes: [{ name: 'app' }] });
        }
        catch (err) {
            console.log(err);
            setLoading(false);
            setState({ ...state, successMessage: '', errorMessage: err.code === 'UserNotConfirmedException' ? 'Confirm your email address before logging in' : 'Your username or password is incorrect' });
        }
    }

    const connectWebsocket = () => {
        client.setLink(new WebSocketLink({
            uri: "wss://api.productabot.com/v1/graphql",
            options: {
                reconnect: true,
                connectionParams: async () => ({
                    headers: {
                        Authorization: "Bearer " + (await Auth.currentSession()).idToken.jwtToken
                    }
                })
            }
        }));
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { width: '100%', height: '100%' }]}
                keyboardVerticalOffset={-200}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatedLogo loading={loading} size={1.5} />
                    <Text style={[styles.baseText, { fontSize: s(50, 0.85), marginLeft: 5 }]}>productabot</Text>
                </TouchableOpacity>
                {state.errorMessage.length > 0 && <Text style={[styles.baseText, { marginTop: 5, marginBottom: -21, color: '#cc0000', textAlign: 'center' }]}>{state.errorMessage}</Text>}
                {state.successMessage.length > 0 && <Text style={[styles.baseText, { marginTop: 5, marginBottom: -21, color: '#006600', textAlign: 'center' }]}>{state.successMessage}</Text>}
                <View style={{ margin: 20 }}>
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' value={state.email} onChangeText={value => { setState({ ...state, email: value }) }} placeholder='Email or username' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address'></TextInput>
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' value={state.password} onChangeText={value => { setState({ ...state, password: value }) }} placeholder='Password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                        onSubmitEditing={login}></TextInput>
                </View>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F0054' }]}
                    onPress={login}
                >
                    <Text style={[styles.baseText, styles.buttonText]}>{loading ? 'Logging in...' : 'Login'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]}
                    onPress={() => { navigation.push('signup') }}>
                    <Text style={[styles.baseText, styles.buttonText]}>Sign up</Text>
                </TouchableOpacity>
                <View>
                    <Text style={{ color: colors.text, textDecorationLine: 'underline', marginTop: 10, textAlign: 'center' }} onPress={() => { navigation.push('reset') }}>Forgot password?</Text>
                    <TouchableOpacity style={{ borderColor: colors.placeholder, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10, marginTop: 30, marginBottom: 10 }} onPress={async (e) => {
                        e.preventDefault();
                        let currentTheme = await AsyncStorage.getItem('theme');
                        let nextTheme = 'dark';
                        if (!currentTheme || currentTheme === 'dark') {
                            nextTheme = 'light';
                        }
                        await AsyncStorage.setItem('theme', nextTheme);
                        setTheme(nextTheme);
                    }} >
                        <Text style={{ color: colors.text, fontSize: Platform.OS === 'web' ? 13 : 15 }}>{theme === 'dark' ? 'Turn on the lights ☀' : 'Turn off the lights ◗*'}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.baseText, { fontSize: 10, color: '#aaaaaa', textAlign: 'center' }]}>© {new Date().getFullYear()} productabot</Text>
                </View>
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent />
        </View>
    );
}
const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.6) {
    return isWeb ? number * factor : number;
}
const makeStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: colors.text
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
        fontSize: isWeb ? s(30) : 22,
        color: '#ffffff'
    },
    textInput: {
        fontSize: isWeb ? s(30) : 22,
        width: 275,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        color: colors.text,
        margin: s(10)
    },
});
