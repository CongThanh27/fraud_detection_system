import React from "react";
import Search from "./common/Search.js";
import List from "./common/List.js";
import Pagination from "./common/Pagination.js";
import ModalAdd from "./common/Modal.js";
import DescriptionEmployee from "./common/DescriptionEmployee.js";
import { Button, Flex } from "antd";


const Test = () => {

  return (
    <>
      <div className="text-black bg-white m-8 p-4 border rounded-[12px] ">
        <div>
          <h1 className="text-2xl font-bold pl-4 pr-4 pt-4">Employee Management</h1>
        </div>
        <div>
          <Search />
        </div>
        <div>
          <Flex  justify="end" wrap="wrap" gap="small" className="site-button-ghost-wrapper !mb-2">
            {/* <Button  type="primary" ghost onClick = {showModalAdd}>
              Register
            </Button> */}
          </Flex>
          <List />
        </div>
        <div className="pt-4">
          <Pagination />
        </div>
        <ModalAdd />
        <DescriptionEmployee />
      </div>
    </>
  );
};

export default Test;
