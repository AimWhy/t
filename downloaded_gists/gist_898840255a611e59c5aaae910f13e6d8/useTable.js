import React from 'react';
export const TableContext = React.createContext(undefined);
export function useTable() {
    const context = React.useContext(TableContext);
    if (context === undefined) {
        throw new Error('useTable must be used within a TableProvider');
    }
    return context;
}
export const TableProvider = ({ children }) => {
    const [currentCol, setCurrentCol] = React.useState(0);
    const [currentRow, setCurrentRow] = React.useState('---');
    const [inputValue, setInputValue] = React.useState('');
    const [readonlyRows, setReadOnlyRows] = React.useState([]);
    const [colKeys, setColKeys] = React.useState([]);
    const [rowKeys, setRowKeys] = React.useState([]);
    const [data, setData] = React.useState({});
    const [hasLegend, setHasLegend] = React.useState(false);
    const [showForm, setShowForm] = React.useState(false);
    const value = {
        data,
        colKeys,
        setColKeys,
        currentCol,
        setCurrentCol,
        currentRow,
        setCurrentRow,
        readonlyRows,
        inputValue,
        setInputValue,
        setReadOnlyRows,
        rowKeys,
        setRowKeys,
        hasLegend,
        setHasLegend,
        showForm,
        setShowForm,
        addReadOnlyRow(col) {
            setReadOnlyRows(pre => {
                const next = new Set([...pre, col]);
                return Array.from(next);
            });
        },
        updateRowKey(val, index) {
            setRowKeys(keys => {
                keys[index] = val;
                return [...keys];
            });
        },
        updateData(key, payload) {
            setData(pre => {
                pre[key] = payload;
                return pre;
            });
        },
    };
    return (<TableContext.Provider value={value}>{children}</TableContext.Provider>);
};