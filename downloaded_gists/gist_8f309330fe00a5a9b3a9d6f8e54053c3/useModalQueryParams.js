import { useState } from 'react';

const useModalQueryParams = () => {
  const [queryObject, setQueryObject] = useState({
    page: 1,
    sort: 'updatedAt:DESC',
    pageSize: 10,
    filters: {
      $and: [],
    },
  });

  const handleChangeFilters = nextFilters => {
    setQueryObject(prev => ({ ...prev, page: 1, filters: { $and: nextFilters } }));
  };

  const handleChangePageSize = pageSize => {
    setQueryObject(prev => ({ ...prev, pageSize: parseInt(pageSize, 10), page: 1 }));
  };

  const handleChangePage = page => {
    setQueryObject(prev => ({ ...prev, page }));
  };

  const handleChangeSort = sort => {
    setQueryObject(prev => ({ ...prev, sort }));
  };

  const handleChangeSearch = _q => {
    if (_q) {
      setQueryObject(prev => ({ ...prev, _q, page: 1 }));
    } else {
      const newState = { page: 1 };

      Object.keys(queryObject).forEach(key => {
        if (!['page', '_q'].includes(key)) {
          newState[key] = queryObject[key];
        }
      });

      setQueryObject(newState);
    }
  };

  return [
    { queryObject, rawQuery: JSON.stringify(queryObject) },
    {
      onChangeFilters: handleChangeFilters,
      onChangePage: handleChangePage,
      onChangePageSize: handleChangePageSize,
      onChangeSort: handleChangeSort,
      onChangeSearch: handleChangeSearch,
    },
  ];
};

export default useModalQueryParams;
