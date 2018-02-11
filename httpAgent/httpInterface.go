package httpagent

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/rhysbryant/gtagreaderemulator"
	"github.com/rhysbryant/gtagreaderemulator/utils"
)

type tagData struct {
	Data        []byte `json:"data"`
	PageIndexes []int  `json:"pageIndexes"`
}

var errorNoPagesspecifiedForReadOrWrite = errors.New(("empty page list, no pages specified for read or write operation"))

var TagConnection tagreaderemulator.TagReaderAPI

func writeErrorResponse(w http.ResponseWriter, err error) {

	w.Header().Add("Content-Type", "application/json")
	w.Header().Add("Server", "tagtool")
	w.WriteHeader(http.StatusBadRequest)

	res := struct{ StatusMessage string }{err.Error()}
	json.NewEncoder(w).Encode(res)
}

func writeJsonResponse(w http.ResponseWriter, object interface{}) {

	w.Header().Add("Content-Type", "application/json")
	w.Header().Add("Server", "tagtool")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(object)
}

func getPageIndexFromRequest(r *http.Request) ([]int, error) {
	val := r.URL.Query().Get("page")
	if val == "" {
		return nil, errorNoPagesspecifiedForReadOrWrite
	}
	pageNumbers := strings.Split(val, ",")
	pageIndexs := []int{}
	for _, val := range pageNumbers {
		pageNum, err := strconv.Atoi(val)
		if err != nil {
			return nil, err
		}
		pageIndexs = append(pageIndexs, pageNum)
	}

	return pageIndexs, nil
}

func Start(listenerPath string) error {
	router := mux.NewRouter().StrictSlash(false)

	router.HandleFunc("/tag", getTagDataRequest).Methods("GET")
	router.HandleFunc("/tag", postTagDataRequest).Methods("POST")

	router.PathPrefix("/").Handler(http.FileServer(http.Dir("ui")))
	return http.ListenAndServe(listenerPath, router)
}

func postTagDataRequest(w http.ResponseWriter, r *http.Request) {
	pageIndexes, err := getPageIndexFromRequest(r)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	td := tagData{}
	err = json.NewDecoder(r.Body).Decode(&td)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	if err := utils.WriteBulkPagesAndVerify(TagConnection, td.Data, pageIndexes...); err != nil {
		writeErrorResponse(w, err)
		return
	}

}

func getTagDataRequest(w http.ResponseWriter, r *http.Request) {
	var err error
	pageIndexes, err := getPageIndexFromRequest(r)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	var buf bytes.Buffer
	var pageIndexesReturned []int

	if pageIndexesReturned, err = utils.ReadBulkPages(TagConnection, &buf, pageIndexes...); err != nil {
		writeErrorResponse(w, err)
		return
	}
	td := tagData{}
	td.Data = buf.Bytes()
	td.PageIndexes = pageIndexesReturned

	writeJsonResponse(w, td)
}
