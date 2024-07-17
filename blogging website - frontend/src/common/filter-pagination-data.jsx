import axios from "axios";

export const filterPaginationData = async ({ create_new_arr = false, state, data, page, countRoute, data_to_send = {} }) => {
    let obj;

    if (state && state.results != null && !create_new_arr) {
        obj = { ...state, results: [...state.results, ...data], page: page };
    } else {
        try {
            const response = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + countRoute, data_to_send);
            const { totalDocs } = response.data;
            obj = { results: data, page: 1, totalDocs };
        } catch (err) {
            console.log(err);
        }
    }

    return obj;
};
