import React, { createContext, FunctionComponent, useContext } from 'react';
import { useNotifications } from '@mantine/notifications';
import axios, { AxiosRequestConfig } from 'axios';

type ApiCallParameters = {
	[key: string]: any;
};

export interface ApiContextInterface {
	get: (
		url: string,
		parameters?: ApiCallParameters,
		options?: AxiosRequestConfig<any>
	) => Promise<any>;

	post: (
		url: string,
		body?: ApiCallParameters,
		options?: AxiosRequestConfig<any>
	) => Promise<any>;
}

const ApiContext = createContext({} as ApiContextInterface);

export const ApiStore: FunctionComponent = ({ children }) => {
	const notifications = useNotifications();

	const onError = (errorMessage: string | null) => {
		notifications.showNotification({
			title: 'network request fail',
			message:
				errorMessage ||
				'an unexpected error has occurred, please try again later',
			color: 'red',
		});
	};

	const get = async (
		url: string,
		parameters?: ApiCallParameters,
		options?: AxiosRequestConfig<any>
	): Promise<any> => {
		try {
			const res = await axios.get(url, {
				params: parameters,
				...options,
			});

			return res.data;
		} catch (e: any) {
			const errorMessage = e.response?.data?.message;

			onError(errorMessage);

			throw errorMessage;
		}
	};

	const post = async (
		url: string,
		parameters?: ApiCallParameters,
		options?: AxiosRequestConfig<any>
	): Promise<any> => {
		try {
			const res = await axios.post(url, parameters, options);

			return res.data.data;
		} catch (e: any) {
			const errorMessage = e.response?.data?.message;

			onError(errorMessage);

			throw errorMessage;
		}
	};

	return (
		<ApiContext.Provider value={{ get, post }}>{children}</ApiContext.Provider>
	);
};

export default ApiContext;
