import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, Platform, Keyboard, LogBox } from 'react-native';
import { Auth } from "aws-amplify";
import LogoSvg from "../svgs/logo"
import { LoadingComponent } from '../components/LoadingComponent';
Platform.OS !== 'web' && LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function LoginScreen({ route, navigation }: any) {
    const [state, setState] = useState({ email: '', password: '', errorMessage: '', successMessage: '', success: false, loading: false });

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        if (route.params.success) { setState({ ...state, success: true, successMessage: 'Success! Confirm your email before logging in' }); }
        if (route.params.reset) { setState({ ...state, success: true, successMessage: 'We sent you a link to reset your password' }); }
        if (route.params.username && route.params.code) {
            Auth.confirmSignUp(route.params.username, route.params.code).then((response) => {
                setState({ ...state, success: true, successMessage: 'Email successfully confirmed! You may log in' });
            });
        }
        if (route.params.demo) {
            setState({ ...state, loading: true });
            Auth.signIn({
                username: 'demo@productabot.com',
                password: 'password'
            }).then(() => {
                setState({ ...state, loading: false, errorMessage: '', success: false, email: '', password: '' });
                navigation.navigate('app');
            });
        }

        Auth.currentSession().then((response) => {
            setState({ ...state, loading: false, errorMessage: '', success: false, email: '', password: '' });
            navigation.navigate('app');
        }).catch((error) => {
        });
    }, [route.params]);

    const login = async () => {
        Keyboard.dismiss();
        setState({ ...state, loading: true })
        try {
            await Auth.signIn({
                username: state.email,
                password: state.password
            });
            setState({ ...state, loading: false, errorMessage: '', success: false, email: '', password: '' });
            navigation.navigate('app');
        }
        catch (err) {
            console.log(err);
            setState({ ...state, loading: false, success: false, errorMessage: err.code === 'UserNotConfirmedException' ? 'Confirm your email address before logging in' : 'Your username or password is incorrect' });
        }
    }
    return (
        <View style={styles.container}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <LogoSvg width={s(50, 0.85)} height={s(50, 0.85)} style={{ marginRight: 10 }} />
                <Text style={[styles.baseText, { fontSize: s(50, 0.85) }]}>productabot</Text>
            </TouchableOpacity>
            <View style={{ margin: 30 }}>
                {state.errorMessage.length > 0 && <Text style={[styles.baseText, { color: '#cc0000', textAlign: 'center', marginTop: -16 }]}>{state.errorMessage}</Text>}
                {state.success && <Text style={[styles.baseText, { color: '#006600', textAlign: 'center', marginTop: -16 }]}>{state.successMessage}</Text>}
                <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }) }} placeholder='email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]}></TextInput>
                <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, password: value }) }} placeholder='password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                    onSubmitEditing={login}></TextInput>
            </View>
            <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F0054' }]}
                onPress={login}
            >
                <Text style={[styles.baseText, styles.buttonText]}>login</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]}
                onPress={() => { navigation.navigate('signup') }}>
                <Text style={[styles.baseText, styles.buttonText]}>signup</Text>
            </TouchableOpacity>
            <Text style={{ color: '#ffffff', textDecorationLine: 'underline' }} onPress={() => { navigation.navigate('reset') }}>forgot password?</Text>
            <Text style={[styles.baseText, { fontSize: 10, color: '#aaaaaa', marginTop: 30 }]}>© {new Date().getFullYear()} productabot</Text>
            {state.loading && <LoadingComponent />}
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
        backgroundColor: '#000000',
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
        margin: s(10)
    },
    buttonText: {
        fontSize: s(30)
    },
    textInput: {
        fontSize: s(30),
        width: 275,
        borderBottomColor: '#ffffff',
        borderBottomWidth: 1,
        color: '#ffffff',
        margin: s(10)
    },
});
