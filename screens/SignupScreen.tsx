import { StackScreenProps } from '@react-navigation/stack';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, Platform, Keyboard } from 'react-native';
import { Auth } from "aws-amplify";
import LogoSvg from "../svgs/logo";
import { LoadingComponent } from '../components/LoadingComponent';

export default function SignupScreen({
    navigation,
}: StackScreenProps<{ Login: undefined; Signup: undefined; App: undefined; }, 'login'>) {
    const [state, setState] = useState({
        email: '', username: '', password: '', confirmPassword: '', errorMessage: '', loading: false
    });
    const signup = async () => {
        Keyboard.dismiss();
        if (!state.email || !state.username || !state.password || !state.confirmPassword) {
            setState({ ...state, errorMessage: "You're missing some information" });
        }
        else if (state.password !== state.confirmPassword) {
            setState({ ...state, errorMessage: "Make sure your passwords match!" });
        }
        else {
            try {
                let response = await Auth.signUp({ username: state.email, password: state.password, attributes: { 'custom:username': state.username, 'custom:userType': 'user' } });
                console.log(response);
                setState({ ...state, errorMessage: '' });
                navigation.navigate('login');
            }
            catch (err) {
                console.log(err);
                if (err.message === "1 validation error detected: Value at 'password' failed to satisfy constraint: Member must have length greater than or equal to 6") {
                    setState({ ...state, errorMessage: "Your password must be at least 6 characters" });
                }
                else if (err.message === "Username should be an email.") {
                    setState({ ...state, errorMessage: "Please enter a valid email address" });
                }
                else if (err.message === "An account with the given email already exists.") {
                    setState({ ...state, errorMessage: "An account with this email already exists" });
                }
            }
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
                <TextInput inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }); }} placeholder='email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]}></TextInput>
                <TextInput inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, username: value }); }} placeholder='username' style={[styles.textInput, isWeb && { outlineWidth: 0 }]}></TextInput>
                <TextInput inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, password: value }); }} placeholder='password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                    onSubmitEditing={() => { }}></TextInput>
                <TextInput inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, confirmPassword: value }); }} placeholder='confirm password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                    onSubmitEditing={() => { }}></TextInput>
            </View>
            <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]} onPress={signup}>
                <Text style={[styles.baseText, styles.buttonText]}>register</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.touchableOpacity, { backgroundColor: '#000000' }]}
                onPress={() => { navigation.navigate('login') }}>
                <Text style={[styles.baseText, styles.buttonText]}>go back</Text>
            </TouchableOpacity>
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
